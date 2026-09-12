const http = require("http");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("PairChat signaling server is running.\n");
});

const io = new Server(server, {
  cors: { origin: "*" }
});

// code -> array of waiting socket ids (max 1 waiting at a time)
const waitingByCode = new Map();
// socketId -> { room, code }
const socketInfo = new Map();

io.on("connection", (socket) => {
  socket.on("join_code", ({ code }) => {
    if (!/^\d{4}$/.test(String(code))) {
      socket.emit("connect_error", { message: "Invalid code" });
      return;
    }

    const waitingSocketId = waitingByCode.get(code);

    if (waitingSocketId && waitingSocketId !== socket.id && io.sockets.sockets.get(waitingSocketId)) {
      // Match found — pair them into a room
      const room = `room_${code}_${Date.now()}`;
      waitingByCode.delete(code);

      socket.join(room);
      const partnerSocket = io.sockets.sockets.get(waitingSocketId);
      partnerSocket.join(room);

      socketInfo.set(socket.id, { room, code });
      socketInfo.set(waitingSocketId, { room, code });

      io.to(room).emit("paired", { room });
    } else {
      // No one waiting with this code yet — wait
      waitingByCode.set(code, socket.id);
      socketInfo.set(socket.id, { room: null, code });
      socket.emit("waiting");
    }
  });

  socket.on("chat_message", ({ text }) => {
    const info = socketInfo.get(socket.id);
    if (!info || !info.room) return;
    socket.to(info.room).emit("chat_message", { text });
  });

  socket.on("disconnect", () => {
    const info = socketInfo.get(socket.id);
    if (info) {
      if (info.room) {
        socket.to(info.room).emit("partner_left");
      }
      if (waitingByCode.get(info.code) === socket.id) {
        waitingByCode.delete(info.code);
      }
    }
    socketInfo.delete(socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`PairChat server listening on port ${PORT}`);
});

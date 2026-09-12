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

const waitingByCode = new Map();
const socketInfo = new Map();

io.on("connection", (socket) => {
  console.log(`[connect] ${socket.id}`);

  socket.on("join_code", ({ code }) => {
    console.log(`[join_code] ${socket.id} sent code "${code}"`);

    if (!/^\d{4}$/.test(String(code))) {
      console.log(`[invalid code] ${socket.id} sent "${code}"`);
      socket.emit("connect_error", { message: "Invalid code" });
      return;
    }

    const waitingSocketId = waitingByCode.get(code);

    if (waitingSocketId && waitingSocketId !== socket.id && io.sockets.sockets.get(waitingSocketId)) {
      const room = `room_${code}_${Date.now()}`;
      waitingByCode.delete(code);

      socket.join(room);
      const partnerSocket = io.sockets.sockets.get(waitingSocketId);
      partnerSocket.join(room);

      socketInfo.set(socket.id, { room, code });
      socketInfo.set(waitingSocketId, { room, code });

      console.log(`[paired] code "${code}" -> room ${room} (${socket.id} + ${waitingSocketId})`);
      io.to(room).emit("paired", { room });
    } else {
      waitingByCode.set(code, socket.id);
      socketInfo.set(socket.id, { room: null, code });
      console.log(`[waiting] code "${code}" now waiting on ${socket.id}`);
      socket.emit("waiting");
    }
  });

  socket.on("chat_message", ({ text }) => {
    const info = socketInfo.get(socket.id);
    if (!info || !info.room) {
      console.log(`[chat_message ignored] ${socket.id} has no room yet`);
      return;
    }
    console.log(`[chat_message] room ${info.room}: "${text}"`);
    socket.to(info.room).emit("chat_message", { text });
  });

  socket.on("disconnect", () => {
    console.log(`[disconnect] ${socket.id}`);
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

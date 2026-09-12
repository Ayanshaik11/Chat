// ⚠️ Set this to your deployed server's URL before building the APK.
// The APK is just a WebView shell — it needs a real server to talk to.
const SERVER_URL = "https://YOUR-SERVER-DOMAIN.example.com";

const pairScreen = document.getElementById("screen-pair");
const chatScreen = document.getElementById("screen-chat");
const codeInput = document.getElementById("codeInput");
const connectBtn = document.getElementById("connectBtn");
const statusMsg = document.getElementById("statusMsg");
const roomLabel = document.getElementById("roomLabel");
const leaveBtn = document.getElementById("leaveBtn");
const messagesEl = document.getElementById("messages");
const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");

let socket = null;
let currentRoom = null;

function showScreen(el) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  el.classList.add("active");
}

function addMessage(text, kind) {
  const div = document.createElement("div");
  div.className = `msg ${kind}`;
  div.textContent = text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

connectBtn.addEventListener("click", () => {
  const code = codeInput.value.trim();
  if (!/^\d{4}$/.test(code)) {
    statusMsg.textContent = "Enter exactly 4 digits.";
    return;
  }

  statusMsg.textContent = "Connecting...";
  connectBtn.disabled = true;

  socket = io(SERVER_URL, { transports: ["websocket"] });

  socket.on("connect", () => {
    socket.emit("join_code", { code });
  });

  socket.on("waiting", () => {
    statusMsg.textContent = "Waiting for someone else to enter the same code...";
  });

  socket.on("paired", ({ room }) => {
    currentRoom = room;
    roomLabel.textContent = `Room ${code}`;
    messagesEl.innerHTML = "";
    addMessage("You're paired! Say hi.", "sys");
    showScreen(chatScreen);
    connectBtn.disabled = false;
  });

  socket.on("chat_message", ({ text }) => {
    addMessage(text, "them");
  });

  socket.on("partner_left", () => {
    addMessage("The other person left the chat.", "sys");
  });

  socket.on("connect_error", () => {
    statusMsg.textContent = "Could not reach server. Check SERVER_URL in app.js.";
    connectBtn.disabled = false;
  });
});

sendBtn.addEventListener("click", sendMessage);
msgInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

function sendMessage() {
  const text = msgInput.value.trim();
  if (!text || !socket) return;
  socket.emit("chat_message", { text });
  addMessage(text, "me");
  msgInput.value = "";
}

leaveBtn.addEventListener("click", () => {
  if (socket) socket.disconnect();
  currentRoom = null;
  codeInput.value = "";
  statusMsg.textContent = "";
  showScreen(pairScreen);
});

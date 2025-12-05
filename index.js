const express = require("express");
const dotEnv = require("dotenv");
const cors = require("cors");
const mongoose = require("mongoose");
const fileUpload = require("express-fileupload");
const http = require("http");
const { Server } = require("socket.io");

// ✅ ROUTES
const merchantRoutes = require("./routes/merchantRoutes");
const restaurantRoutes = require("./routes/restaurantRoutes");
const groceryRoutes = require("./routes/groceryRoutes");
const agentRoutes = require("./routes/agentRoutes");
const userRoutes = require("./routes/userRoutes");
const orderRoutes = require("./routes/orderRoutes");
const rideRoutes = require("./routes/rideRoutes");
const whatsappRoutes = require("./routes/whatsappRoutes");

dotEnv.config();
const app = express();

// ✅ MIDDLEWARES
app.use(express.json());
app.use(cors());

app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
  })
);

// ✅ ROUTES
app.use("/merchant", merchantRoutes);
app.use("/restaurent", restaurantRoutes);
app.use("/grocery", groceryRoutes);
app.use("/agent", agentRoutes);
app.use("/user", userRoutes);
app.use("/order", orderRoutes);
app.use("/ride", rideRoutes);
app.use("/webhook", whatsappRoutes);

// ✅ ROOT TEST
app.get("/", (req, res) => {
  res.send("Startup MVP Running ✅");
});

// ✅ CREATE HTTP SERVER
const server = http.createServer(app);

// ✅ ATTACH SOCKET.IO
global.io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// ✅ ✅ ✅ GLOBAL AGENT SOCKET REGISTRY (VERY IMPORTANT)
global.agentSockets = {}; // { agentId: socketId }

// ✅ SOCKET CONNECTION HANDLER
global.io.on("connection", (socket) => {
  console.log("✅ Agent connected via Socket:", socket.id);

  // ✅ REGISTER AGENT SOCKET
  socket.on("agent-online", ({ agentId }) => {
    const key = agentId.toString(); // ✅ ALWAYS USE STRING KEY
    global.agentSockets[key] = socket.id;

    console.log("✅ Agent registered:", key, "Socket:", socket.id);
    console.log("🧠 Stored sockets:", global.agentSockets);
  });

  // ✅ CLEANUP ON DISCONNECT
  socket.on("disconnect", () => {
    console.log("❌ Agent disconnected:", socket.id);

    for (const id in global.agentSockets) {
      if (global.agentSockets[id] === socket.id) {
        delete global.agentSockets[id];
        console.log("🧹 Removed agent socket:", id);
        break;
      }
    }

    console.log("🧠 Updated sockets:", global.agentSockets);
  });
});

// ✅ MONGODB CONNECTION
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.log("❌ MongoDB Error:", err));

// ✅ START SERVER + SOCKET
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server + Socket.IO running on port ${PORT}`);
});

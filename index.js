const express = require("express");
const dotEnv = require("dotenv");
const cors = require("cors");
const mongoose = require("mongoose");
const fileUpload = require("express-fileupload");
const http = require("http"); // ✅ REQUIRED FOR SOCKET

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

app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: "/tmp/"
}));

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

// ✅ CREATE HTTP SERVER FROM EXPRESS
const server = http.createServer(app);

// ✅ ATTACH SOCKET.IO TO THAT SERVER
const { Server } = require("socket.io");
global.io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ✅ ✅ AGENT SOCKET REGISTRY (VERY IMPORTANT)
global.agentSockets = {}; // ✅ ADD THIS LINE AT TOP (GLOBAL STORE)

global.io.on("connection", (socket) => {
  console.log("✅ Agent connected via Socket:", socket.id);

  // ✅ REGISTER AGENT SOCKET
  socket.on("agent-online", ({ agentId }) => {
    global.agentSockets[agentId] = socket.id;
    console.log("✅ Agent registered:", agentId, "Socket:", socket.id);
  });

  socket.on("disconnect", () => {
    console.log("❌ Agent disconnected:", socket.id);

    // ✅ REMOVE AGENT FROM MAP ON DISCONNECT
    for (const id in global.agentSockets) {
      if (global.agentSockets[id] === socket.id) {
        delete global.agentSockets[id];
        console.log("🧹 Removed agent socket:", id);
        break;
      }
    }
  });
});


// ✅ MONGODB CONNECTION
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.log("❌ MongoDB connection Error:", err));

// ✅ START SERVER
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server + Socket.IO running on port ${PORT}`);
});

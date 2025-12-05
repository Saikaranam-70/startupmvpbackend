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
global.io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ✅ OPTIONAL: SOCKET CONNECTION LOG
global.io.on("connection", (socket) => {
  console.log("✅ Agent connected via Socket:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ Agent disconnected:", socket.id);
  });
});

// ✅ MONGODB CONNECTION
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected Successfully"))
  .catch((err) => console.log("MongoDB connection Error:", err));

// ✅ START SERVER
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server + Socket.IO running on port ${PORT}`);
});

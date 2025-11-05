const express = require("express")
const dotEnv = require("dotenv")
const cors = require("cors")
const mongoose = require("mongoose")
const merchantRoutes = require("./routes/merchantRoutes")
const restaurantRoutes = require("./routes/restaurantRoutes")
const groceryRoutes = require("./routes/groceryRoutes")
const fileUpload = require("express-fileupload")
const agentRoutes = require("./routes/agentRoutes")
const userRoutes = require("./routes/userRoutes")
const orderRoutes = require("./routes/orderRoutes")
const rideRoutes = require("./routes/rideRoutes")
const whatsappRoutes = require("./routes/whatsappRoutes")


dotEnv.config();
const app = express();
app.use(express.json())
app.use(cors())

mongoose.connect(process.env.MONGO_URI).then(()=>{
    console.log("MongoDB Connected Successfully")
}).catch((err)=>{
    console.log("MongoDB connection Error: ", err)
})
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: "/tmp/"
}));

app.use("/merchant", merchantRoutes)
app.use("/restaurent", restaurantRoutes)
app.use("/grocery", groceryRoutes)
app.use("/agent", agentRoutes)
app.use("/user", userRoutes)
app.use("/order", orderRoutes)
app.use("/ride", rideRoutes)
app.use("/webhook", whatsappRoutes)


app.use('/', (req, res)=>{
    res.send("Startup MVP")
})


const PORT = process.env.PORT || 5000
app.listen(PORT, ()=>{
    console.log(`Server Running in the port number ${PORT}`)
})

// config/groqClient.js
const Groq = require("groq-sdk");
require("dotenv").config(); // makes process.env.GROQ_API_KEY available

module.exports = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

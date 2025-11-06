const OpenAI = require("openai");
const dotEnv = require("dotenv")
dotEnv.config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function parseFoodQuery(text) {
  const response = await client.chat.completions.create({
    model: "gpt-5", // ✅ You can keep this same
    messages: [
      {
        role: "system",
        content: "Extract food item name and budget. Respond in JSON only: {\"item\":\"\",\"budget\":0}"
      },
      {
        role: "user",
        content: text
      }
    ]
  });

  try {
    return JSON.parse(response.choices[0].message.content);
  } catch (err) {
    return null;
  }
}

module.exports = parseFoodQuery;

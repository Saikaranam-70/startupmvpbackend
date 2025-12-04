const Groq = require("groq-sdk")
const dotEnv = require("dotenv")
dotEnv.config()

 const GROQ_API_KEY = "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"

const groq = new Groq({apiKey: process.env.GROQ_API_KEY || GROQ_API_KEY});

async function test(){
    const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{role: "user", content: "Hello"}]
    })
    console.log(response.choices[0].message)
}
test()
const OpenAI = require("openai");

const client = new OpenAI({
    apiKey: "YOUR_API_KEY",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai"
});

async function test() {
    try {
        const res = await client.chat.completions.create({
            model: "gemini-2.0-flash",
            messages: [
                {
                    role: "user",
                    content: "Hello"
                }
            ]
        });

        console.log(res);
    } catch (e) {
        console.log("STATUS:", e.status);
        console.log("MESSAGE:", e.message);
        console.log("ERROR:", e.error);
        console.log("BODY:", e.body);
        console.dir(e, { depth: null });
    }
}

test();
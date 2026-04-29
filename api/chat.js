import 'dotenv/config';

export default async function handler(req, res) {
    console.log(`[Server] Incoming request: ${req.method}`);

    if (req.method !== 'POST') {
        console.warn(`[Server] Method ${req.method} not allowed`);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Explicitly parse message from body
    let message = '';
    try {
        if (typeof req.body === 'string') {
            const body = JSON.parse(req.body);
            message = body.message;
        } else {
            message = req.body.message;
        }
    } catch (e) {
        console.error("[Server] Failed to parse request body:", e.message);
        return res.status(400).json({ error: 'Invalid request body' });
    }

    const API_KEY = process.env.OPENROUTER_API_KEY;

    console.log(`[Server] Chat request received for: "${message}"`);

    if (!API_KEY) {
        console.error("[Server] CRITICAL: OPENROUTER_API_KEY is missing!");
        return res.status(200).json({ response: "I am missing my API key configuration." });
    }

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://github.com/Jaivardhan-Raahi/Orbix",
                "X-Title": "Orbix AI Companion"
            },
            body: JSON.stringify({
                "model": "openrouter/free",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are Orbix, a floating AI orb companion. Give short, natural responses."
                    },
                    {
                        "role": "user",
                        "content": message
                    }
                ]
            })
        });

        console.log(`[Server] OpenRouter response status: ${response.status}`);
        const data = await response.json();
        
        if (!response.ok) {
            console.error("[Server] OpenRouter Error:", JSON.stringify(data));
            return res.status(200).json({ response: "AI service is currently unavailable." });
        }

        const aiResponse = data.choices?.[0]?.message?.content || "Stay focused.";
        console.log(`[Server] AI Success: "${aiResponse}"`);
        
        res.status(200).json({ response: aiResponse });
    } catch (error) {
        console.error("[Server] Exception during fetch:", error.message);
        res.status(200).json({ response: "Something went wrong on the server." });
    }
}

import 'dotenv/config';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { message } = req.body;
    const API_KEY = process.env.OPENROUTER_API_KEY;

    // Log the request arrival (visible in Vercel Logs)
    console.log(`[Server] Processing chat request for message: "${message}"`);

    if (!API_KEY) {
        console.error("[Server] CRITICAL ERROR: OPENROUTER_API_KEY environment variable is missing.");
        return res.status(200).json({ response: "Stay focused." });
    }

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://github.com/Jaivardhan-Raahi/Orbix", // Required by some OpenRouter models
                "X-Title": "Orbix AI Companion"
            },
            body: JSON.stringify({
                "model": "google/gemini-2.0-flash-lite-preview-02-05:free", // Using a stable free model
                "messages": [
                    {
                        "role": "system",
                        "content": "You are Orbix, a floating AI orb companion. You are slightly strict, helpful, and give short, natural responses."
                    },
                    {
                        "role": "user",
                        "content": message
                    }
                ]
            })
        });

        // Log the status code
        console.log(`[Server] OpenRouter Status: ${response.status} ${response.statusText}`);

        const data = await response.json();
        
        if (!response.ok) {
            console.error("[Server] OpenRouter Error Body:", JSON.stringify(data));
            return res.status(200).json({ response: "Stay focused." });
        }

        const aiResponse = data.choices?.[0]?.message?.content || "Stay focused.";
        console.log(`[Server] AI Success Response: "${aiResponse}"`);
        
        res.status(200).json({ response: aiResponse });
    } catch (error) {
        console.error("[Server] Fetch Exception:", error.message);
        res.status(200).json({ response: "Stay focused." });
    }
}

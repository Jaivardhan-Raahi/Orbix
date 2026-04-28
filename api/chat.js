export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { message } = req.body;
    const API_KEY = process.env.OPENROUTER_API_KEY;

    // Server-side check for key availability (logged to server console, not frontend)
    if (!API_KEY) {
        console.error("[Server] OPENROUTER_API_KEY is missing in environment variables.");
        return res.status(200).json({ response: "Stay focused." });
    }

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                "model": "google/gemini-2.0-flash-lite-preview-02-05:free",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are Orbix, a floating AI orb companion. You are slightly strict but helpful. Keep responses to ONE short sentence."
                    },
                    {
                        "role": "user",
                        "content": message
                    }
                ]
            })
        });

        const data = await response.json();
        
        if (data.error) {
            console.error("[Server] OpenRouter API Error:", data.error);
            return res.status(200).json({ response: "Stay focused." });
        }

        const aiResponse = data.choices?.[0]?.message?.content || "Stay focused.";
        res.status(200).json({ response: aiResponse });
    } catch (error) {
        console.error("[Server] Proxy Error:", error);
        res.status(200).json({ response: "Stay focused." });
    }
}

export async function chatWithAI(message) {
    const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
    
    if (!API_KEY || API_KEY === 'your_openrouter_key_here') {
        console.warn("AI: No API Key found. Using fallback.");
        return "I need my power source (API Key) to think properly.";
    }

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": window.location.origin,
                "X-Title": "Orbix AI"
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
        return data.choices[0].message.content;
    } catch (error) {
        console.error("AI Error:", error);
        return "Stay focused.";
    }
}

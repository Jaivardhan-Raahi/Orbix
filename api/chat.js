import 'dotenv/config';

// Simple in-memory cache
const cache = new Map();

// Offline fallbacks based on context keywords
const FALLBACKS = {
    distraction: ["Stay focused on your goals.", "Let's get back to work.", "Eyes on the prize."],
    idle: ["Still with me?", "Ready to keep going?", "I'm here if you need focus."],
    general: ["Stay focused. Continue.", "Let's keep moving.", "You're doing great, keep at it."]
};

function getOfflineFallback(message) {
    const msg = message.toLowerCase();
    if (msg.includes("laptop") || msg.includes("phone") || msg.includes("staring")) return FALLBACKS.distraction[Math.floor(Math.random() * FALLBACKS.distraction.length)];
    if (msg.includes("quiet") || msg.includes("inactive")) return FALLBACKS.idle[Math.floor(Math.random() * FALLBACKS.idle.length)];
    return FALLBACKS.general[Math.floor(Math.random() * FALLBACKS.general.length)];
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    let message = '';
    try {
        message = typeof req.body === 'string' ? JSON.parse(req.body).message : req.body.message;
    } catch (e) {
        return res.status(400).json({ error: 'Invalid request body' });
    }

    // 1. Caching Layer
    if (cache.has(message)) {
        console.log(`[Chat] Serving cached response for: "${message.substring(0, 20)}..."`);
        return res.status(200).json({ response: cache.get(message) });
    }

    const API_KEY = process.env.OPENROUTER_API_KEY;
    if (!API_KEY) return res.status(200).json({ response: getOfflineFallback(message) });

    // 2. Retry Logic with Backoff
    let attempts = 0;
    const maxAttempts = 2;
    let lastError = null;

    while (attempts <= maxAttempts) {
        try {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "model": "openrouter/free",
                    "messages": [
                        { "role": "system", "content": "You are Orbix, a floating AI orb companion. Give short, one-sentence study tips or focus reminders." },
                        { "role": "user", "content": message }
                    ]
                })
            });

            // Handle Rate Limits (429) - Stop retrying immediately
            if (response.status === 429) {
                console.warn("[Chat] Rate limit hit (429). Returning fallback.");
                return res.status(200).json({ response: getOfflineFallback(message) });
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `HTTP ${response.status}`);
            }

            const data = await response.json();
            const aiResponse = data.choices?.[0]?.message?.content || getOfflineFallback(message);
            
            // Save to cache
            cache.set(message, aiResponse);
            console.log(`[Chat] AI Success: "${aiResponse}"`);
            return res.status(200).json({ response: aiResponse });

        } catch (error) {
            attempts++;
            lastError = error;
            console.error(`[Chat] Attempt ${attempts} failed:`, error.message);
            if (attempts <= maxAttempts) {
                const delay = Math.pow(2, attempts) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    // 3. Final Fallback if all attempts fail
    console.error("[Chat] All AI attempts failed. Returning fallback.");
    return res.status(200).json({ response: getOfflineFallback(message) });
}

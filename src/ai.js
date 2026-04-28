export async function chatWithAI(message) {
    try {
        console.log(`[AI] Sending message to proxy: "${message}"`);
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message })
        });

        if (!response.ok) {
            console.error(`[AI] Proxy error: ${response.status}`);
            return "My connection is unstable. Stay focused.";
        }

        const data = await response.json();
        return data.response || "Stay focused.";
    } catch (error) {
        console.error("[AI] Frontend Error:", error);
        return "Stay focused.";
    }
}

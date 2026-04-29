import { UniversalEdgeTTS } from 'edge-tts-universal';

export const runtime = "nodejs";

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });

    console.log(`[TTS] Generating: "${text.substring(0, 30)}..."`);

    try {
        // UniversalEdgeTTS might need a timeout or specific configuration for serverless
        const tts = new UniversalEdgeTTS(text, 'en-US-AriaNeural');
        
        // Use a race to prevent hanging the serverless function
        const audioPromise = tts.synthesize();
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("TTS synthesis timed out after 8s")), 8000)
        );

        const audioBuffer = await Promise.race([audioPromise, timeoutPromise]);

        if (!audioBuffer || audioBuffer.length === 0) {
            throw new Error("TTS generated no data");
        }

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', audioBuffer.length);
        res.status(200).send(audioBuffer);

    } catch (error) {
        console.error("[TTS] Error:", error.message);
        // Return the actual error to the frontend so the mobile console can see it
        res.status(500).json({ 
            error: "TTS failed", 
            message: error.message,
            stack: error.stack?.substring(0, 200)
        });
    }
}

import { UniversalEdgeTTS } from 'edge-tts-universal';

// Force Node.js runtime to support edge-tts-universal dependencies
export const runtime = "nodejs";

/**
 * Stable Backend TTS endpoint using Microsoft Edge Neural Voices
 */
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { text } = req.body;

    if (!text) {
        return res.status(400).json({ error: 'Text is required' });
    }

    console.log(`[Edge-TTS] Generating audio for: "${text.substring(0, 30)}..."`);

    try {
        const tts = new UniversalEdgeTTS(text, 'en-US-AriaNeural');
        
        // synthesize() returns a Buffer in Node.js
        const audioBuffer = await tts.synthesize();

        if (!audioBuffer) {
            console.error("[Edge-TTS] Result was null or undefined");
            return res.status(500).json({ error: "TTS generated no data" });
        }

        const bufferLength = audioBuffer.length || audioBuffer.byteLength || 0;
        
        if (bufferLength === 0) {
            console.error("[Edge-TTS] Generated an empty buffer");
            return res.status(500).json({ error: "TTS generated empty audio" });
        }

        console.log(`[Edge-TTS] Successfully generated ${bufferLength} bytes.`);

        // Ensure we are sending the buffer correctly
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', bufferLength);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        
        // Use send(Buffer) for Node.js environments
        return res.status(200).send(audioBuffer);

    } catch (error) {
        console.error("[Edge-TTS] Critical Failure:", error.message);
        return res.status(500).json({ 
            error: "TTS failed", 
            details: error.message,
            stack: error.stack 
        });
    }
}

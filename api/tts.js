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

    console.log(`[TTS] Generating audio for: "${text.substring(0, 30)}..."`);

    try {
        // Correct usage for edge-tts-universal:
        // New instance requires (text, voice)
        const tts = new UniversalEdgeTTS(text, 'en-US-AriaNeural');
        
        // Synthesize returns the full audio buffer
        const audioBuffer = await tts.synthesize();

        if (!audioBuffer || audioBuffer.length === 0) {
            throw new Error("Empty audio buffer generated");
        }

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24h
        res.status(200).send(audioBuffer);

        console.log(`[TTS] Success: ${audioBuffer.length} bytes served.`);

    } catch (error) {
        console.error("[TTS] Failure:", error.message);
        res.status(500).json({ error: "TTS failed", details: error.message });
    }
}

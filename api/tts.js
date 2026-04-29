import { UniversalEdgeTTS } from 'edge-tts-universal';

export const runtime = "nodejs";

/**
 * Robust Backend TTS endpoint
 */
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });

    console.log(`[TTS] Generating: "${text.substring(0, 30)}..."`);

    try {
        const tts = new UniversalEdgeTTS(text, 'en-US-AriaNeural');
        
        const audioPromise = tts.synthesize();
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("TTS synthesis timed out after 10s")), 10000)
        );

        const result = await Promise.race([audioPromise, timeoutPromise]);

        if (!result) {
            throw new Error("TTS generated null or undefined result");
        }

        // Determine length safely (Uint8Array, Buffer, or ArrayBuffer)
        const bufferLength = result.length ?? result.byteLength ?? 0;

        if (bufferLength === 0) {
            throw new Error("TTS generated an empty buffer");
        }

        console.log(`[TTS] Success: ${bufferLength} bytes, Type: ${typeof result}`);

        // Ensure we send a Node.js Buffer
        const finalBuffer = Buffer.isBuffer(result) ? result : Buffer.from(result);

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', finalBuffer.length);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        
        return res.status(200).send(finalBuffer);

    } catch (error) {
        console.error("[TTS] Critical Failure:", error.message);
        res.status(500).json({ 
            error: "TTS failed", 
            message: error.message
        });
    }
}

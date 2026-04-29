import { MsEdgeTTS } from 'msedge-tts';

export const runtime = "nodejs";

/**
 * High-stability TTS backend using msedge-tts
 */
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Text is required' });

    console.log(`[TTS] Generating using msedge-tts: "${text.substring(0, 30)}..."`);

    try {
        const tts = new MsEdgeTTS();
        
        // en-US-AriaNeural is the standard high-quality voice
        // audio-24khz-48kbitrate-mono-mp3 is a very stable format
        await tts.setMetadata("en-US-AriaNeural", "audio-24khz-48kbitrate-mono-mp3");

        // msedge-tts uses a more robust approach to capture the full stream
        const audioBuffer = await new Promise((resolve, reject) => {
            const chunks = [];
            const result = tts.toStream(text);
            const stream = result.audioStream || result; // Fallback in case of different msedge-tts versions

            stream.on('data', (chunk) => chunks.push(chunk));
            stream.on('end', () => resolve(Buffer.concat(chunks)));
            stream.on('close', () => resolve(Buffer.concat(chunks))); // Ensure close event also resolves
            stream.on('error', (err) => reject(err));
            
            // Add a timeout to the promise itself
            setTimeout(() => reject(new Error("Stream timeout after 12s")), 12000);
        });

        if (!audioBuffer || audioBuffer.length === 0) {
            throw new Error("TTS generated zero bytes");
        }

        console.log(`[TTS] Success! Generated ${audioBuffer.length} bytes.`);

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', audioBuffer.length);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        
        return res.status(200).send(audioBuffer);

    } catch (error) {
        console.error("[TTS] Critical Failure:", error.message);
        res.status(500).json({ 
            error: "TTS failed", 
            message: error.message
        });
    }
}

import { MsEdgeTTS, OUTPUT_FORMAT } from 'edge-tts';

/**
 * Backend TTS endpoint using Microsoft Edge Neural Voices (Free & High Quality)
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
        const tts = new MsEdgeTTS();
        
        // Use a high-quality neural voice
        // en-US-AriaNeural is excellent for companions
        await tts.setMetadata('en-US-AriaNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

        // edge-tts usually works by providing a stream or writing to a file.
        // We will generate the audio and send it as a buffer to the client.
        const audioBuffer = await tts.toAudio(text);

        if (!audioBuffer || audioBuffer.length === 0) {
            throw new Error("Edge-TTS generated an empty buffer");
        }

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for repeated phrases
        res.status(200).send(audioBuffer);

        console.log(`[Edge-TTS] Successfully served audio buffer (${audioBuffer.length} bytes).`);

    } catch (error) {
        console.error("[Edge-TTS] Error:", error.message);
        res.status(500).json({ 
            error: "Failed to generate speech", 
            details: error.message 
        });
    }
}

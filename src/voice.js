// High-performance voice system using AudioContext and Backend TTS
let audioCtx = null;
let currentSource = null;
let isInterrupted = false;

export function initVoice() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        console.log("[Voice] AudioContext initialized. State:", audioCtx.state);
    }
    // Resume context if suspended (common browser requirement)
    if (audioCtx.state === 'suspended') {
        console.log("[Voice] Resuming suspended AudioContext...");
        audioCtx.resume().then(() => {
            console.log("[Voice] AudioContext resumed successfully. State:", audioCtx.state);
        });
    }
}

/**
 * Interrupts any ongoing speech playback immediately.
 */
export function interrupt() {
    isInterrupted = true;
    if (currentSource) {
        try {
            console.log("[Voice] Stopping current source source...");
            currentSource.stop();
        } catch (e) {
            // Source might have already stopped
        }
        currentSource = null;
    }
    console.log("[Voice] Playback interrupted.");
}

/**
 * Splits text into sentences for pseudo-streaming.
 */
function splitIntoSentences(text) {
    return text.match(/[^.!?]+[.!?]+/g) || [text];
}

/**
 * Main entry point for speaking text. 
 * Decoupled from UI to ensure no blocking.
 */
export async function speak(text) {
    console.log(`[Voice] Starting speech for: "${text}"`);
    initVoice();
    isInterrupted = false;
    
    const sentences = splitIntoSentences(text);
    console.log(`[Voice] Text split into ${sentences.length} chunks.`);

    for (const sentence of sentences) {
        if (isInterrupted) {
            console.log("[Voice] Speech loop exited due to interruption.");
            break;
        }
        
        try {
            console.log(`[Voice] Processing sentence: "${sentence.trim()}"`);
            await playSentence(sentence.trim());
        } catch (err) {
            console.error("[Voice] Chunk playback failed:", err);
        }
    }
}

async function playSentence(sentence) {
    if (!sentence || isInterrupted) return;

    console.log(`[Voice] Fetching chunk from backend: "${sentence.substring(0, 20)}..."`);
    
    const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sentence })
    });

    if (!response.ok) {
        console.error(`[Voice] Backend fetch failed with status: ${response.status}`);
        const errorData = await response.json().catch(() => ({}));
        console.error(`[Voice] Error details:`, errorData);
        throw new Error(`TTS Fetch failed: ${response.status}`);
    }

    console.log("[Voice] Chunk received. Decoding audio data...");
    const arrayBuffer = await response.arrayBuffer();
    if (isInterrupted) return;

    try {
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        console.log(`[Voice] Audio decoded successfully. Duration: ${audioBuffer.duration.toFixed(2)}s`);
        if (isInterrupted) return;

        return new Promise((resolve) => {
            const source = audioCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioCtx.destination);
            
            currentSource = source;
            source.onended = () => {
                console.log("[Voice] Chunk playback ended.");
                if (currentSource === source) currentSource = null;
                resolve();
            };
            
            console.log("[Voice] Starting playback...");
            source.start(0);
        });
    } catch (decodeErr) {
        console.error("[Voice] Audio decoding error:", decodeErr);
        throw decodeErr;
    }
}

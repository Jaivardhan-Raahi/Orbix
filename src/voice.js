// High-performance voice system using AudioContext and Backend TTS
let audioCtx = null;
let currentSource = null;
let isInterrupted = false;

export function initVoice() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        console.log("[Voice] AudioContext initialized.");
    }
    // Resume context if suspended (common browser requirement)
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

/**
 * Interrupts any ongoing speech playback immediately.
 */
export function interrupt() {
    isInterrupted = true;
    if (currentSource) {
        try {
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
    initVoice();
    isInterrupted = false;
    
    const sentences = splitIntoSentences(text);
    console.log(`[Voice] Speaking ${sentences.length} chunks.`);

    for (const sentence of sentences) {
        if (isInterrupted) break;
        
        try {
            await playSentence(sentence.trim());
        } catch (err) {
            console.error("[Voice] Chunk playback failed:", err);
        }
    }
}

async function playSentence(sentence) {
    if (!sentence || isInterrupted) return;

    console.log(`[Voice] Fetching chunk: "${sentence.substring(0, 20)}..."`);
    
    const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sentence })
    });

    if (!response.ok) {
        throw new Error(`TTS Fetch failed: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    if (isInterrupted) return;

    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    if (isInterrupted) return;

    return new Promise((resolve) => {
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        
        currentSource = source;
        source.onended = () => {
            if (currentSource === source) currentSource = null;
            resolve();
        };
        
        source.start(0);
    });
}

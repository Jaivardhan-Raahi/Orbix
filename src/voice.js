// Track if speech is enabled
let speechEnabled = false;

export function initVoice() {
    if (!window.speechSynthesis) return;
    
    // Create a silent utterance to "unlock" the speech system
    const silent = new SpeechSynthesisUtterance("");
    window.speechSynthesis.speak(silent);
    speechEnabled = true;
    console.log("Voice: System initialized.");
    
    // Prime the voices (some browsers need this)
    window.speechSynthesis.getVoices();
}

export function speak(text) {
    if (!window.speechSynthesis) {
        console.error("Voice: SpeechSynthesis not supported.");
        return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Try to find a good English voice
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
    if (englishVoice) utterance.voice = englishVoice;

    utterance.pitch = 1.2;
    utterance.rate = 1.0;
    utterance.volume = 1.0;

    // Log for debugging
    console.log(`Voice: Speaking "${text}"`);

    window.speechSynthesis.speak(utterance);
}

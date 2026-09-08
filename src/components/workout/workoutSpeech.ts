// Web Speech API wrapper for optional voice cues. Fully offline (speechSynthesis
// never makes a network request), silent no-op when unavailable, cancels any
// previous utterance so two voice announcements can never overlap.

let lastUtterance: SpeechSynthesisUtterance | null = null;

export function speak(text: string, enabled = true): void {
  if (!enabled) return;
  try {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    lastUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  } catch {
    // speech unavailable -> silent fallback
  }
}

export function speakCountdownValue(value: number | 'go', enabled = true): void {
  if (!enabled) return;
  const label =
    value === 'go' ? 'Go' : value === 3 ? 'Trois' : value === 2 ? 'Deux' : value === 1 ? 'Un' : String(value);
  speak(label, true);
}

export function cancelSpeech(): void {
  try {
    if (typeof window !== 'undefined' && window.speechSynthesis && lastUtterance) {
      window.speechSynthesis.cancel();
      lastUtterance = null;
    }
  } catch {
    // ignore
  }
}
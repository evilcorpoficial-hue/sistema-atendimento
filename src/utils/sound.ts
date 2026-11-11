import { TicketCategory } from '../types';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioCtxClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Plays a high-quality crystal bell / chime sound (toque de sino)
 */
export function playChimeSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Double chime frequencies (High E6 ~ 1318Hz, B5 ~ 987Hz)
    const tones = [
      { freq: 1174.66, delay: 0, duration: 1.5, gain: 0.35 },   // D6
      { freq: 1567.98, delay: 0.18, duration: 2.2, gain: 0.5 }   // G6 (resonant bell)
    ];

    tones.forEach(({ freq, delay, duration, gain }) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + delay);

      // Attack and exponential decay for bell resonance
      gainNode.gain.setValueAtTime(0.0001, now + delay);
      gainNode.gain.exponentialRampToValueAtTime(gain, now + delay + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + duration + 0.1);
    });
  } catch (e) {
    console.warn('Audio play error:', e);
  }
}

/**
 * Helper to find best Portuguese Female Voice for Speech Synthesis
 */
function findFemalePtVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return undefined;

  const ptVoices = voices.filter(v => {
    const lang = v.lang.replace('_', '-').toLowerCase();
    return lang.includes('pt');
  });

  if (ptVoices.length === 0) return undefined;

  // Key names indicating female voices in Portuguese / Web Speech API
  const femaleKeywords = [
    'luciana', 'francisca', 'heloisa', 'maria', 'leticia', 'letícia', 'vitoria', 'vitória', 
    'camila', 'fernanda', 'yara', 'google português do brasil', 'google portuguese',
    'female', 'feminina', 'online (natural)'
  ];

  // 1. Look for a pt-BR female voice
  const femalePtBr = ptVoices.find(v => {
    const lang = v.lang.replace('_', '-').toLowerCase();
    const name = v.name.toLowerCase();
    return lang.includes('pt-br') && femaleKeywords.some(kw => name.includes(kw));
  });
  if (femalePtBr) return femalePtBr;

  // 2. Look for any pt voice matching female keywords
  const femalePt = ptVoices.find(v => {
    const name = v.name.toLowerCase();
    return femaleKeywords.some(kw => name.includes(kw));
  });
  if (femalePt) return femalePt;

  // 3. Fallback to any pt-BR voice
  const anyPtBr = ptVoices.find(v => v.lang.replace('_', '-').toLowerCase().includes('pt-br'));
  if (anyPtBr) return anyPtBr;

  // 4. Fallback to any pt voice
  return ptVoices[0];
}

/**
 * Speaks the ticket details using Web Speech API in Portuguese (pt-BR) with female voice
 */
export function speakTicket(code: string, desk: string, categories?: TicketCategory[]): void {
  if (!('speechSynthesis' in window)) return;
  // Guard against calling reset / zero tickets (e.g. 00, 00 GERAL, Senha 0)
  if (!code || code.trim() === '00' || code.trim() === '0' || /^00?\b/i.test(code.trim())) {
    return;
  }

  try {
    window.speechSynthesis.cancel(); // Stop current speech if speaking

    const parts = code.trim().split(' ');
    const rawNum = parts[0] || '';
    // Strip leading zeros so Web Speech API speaks "Senha 1" ("Senha um") instead of "Senha 01" ("Senha zero um")
    const cleanNum = rawNum.replace(/^0+/, '') || '0';
    if (cleanNum === '0') return; // Do not speak ticket 0
    const rawCatCode = parts.slice(1).join(' ').trim().toUpperCase();

    // Determine custom pronunciation for queue
    let categorySpokenText = '';

    if (categories && categories.length > 0) {
      const matchCat = categories.find(c => c.code.toUpperCase() === rawCatCode);
      if (matchCat) {
        if (matchCat.speechText && matchCat.speechText.trim()) {
          categorySpokenText = matchCat.speechText.trim();
        } else if (matchCat.name && matchCat.name.trim()) {
          categorySpokenText = matchCat.name.trim();
        }
      }
    }

    if (!categorySpokenText) {
      // Default natural pronunciation for standard codes
      if (rawCatCode === 'CAF') {
        categorySpokenText = 'kaf'; // Spoken as "kaf" for natural Portuguese pronunciation
      } else if (rawCatCode === 'INCRA') {
        categorySpokenText = 'incra';
      } else if (rawCatCode === 'GERAL') {
        categorySpokenText = 'Atendimento Geral';
      } else {
        categorySpokenText = rawCatCode.toLowerCase();
      }
    }

    // Ensure 'caf' is pronounced as 'kaf' so speech engines don't spell it out as C-A-F or say cafi
    if (categorySpokenText.toLowerCase() === 'caf' || categorySpokenText.toLowerCase() === 'cafi') {
      categorySpokenText = 'kaf';
    }

    // Clean desk text
    const cleanDesk = (desk || 'Sala 1')
      .replace(/guichê\s*0?1/gi, 'Sala 1')
      .replace(/guichê\s*0?2/gi, 'Sala 2')
      .replace(/guichê\s*0?3/gi, 'Sala 3')
      .replace(/guichê/gi, 'Sala');

    // Concise call format: "Senha 1 cafi, Sala 1"
    const textToSpeak = `Senha ${cleanNum} ${categorySpokenText}, ${cleanDesk}.`;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'pt-BR';
    utterance.rate = 0.9; // Calm pace for clear acoustics in reception
    utterance.pitch = 1.15; // Bright tone for clear female voice
    utterance.volume = 1.0;

    const setVoice = () => {
      const bestFemaleVoice = findFemalePtVoice();
      if (bestFemaleVoice) {
        utterance.voice = bestFemaleVoice;
      }
    };

    setVoice();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = setVoice;
    }

    // Delay speech slightly to let the chime ring clearly first
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 600);
  } catch (err) {
    console.warn('Speech synthesis error:', err);
  }
}

/**
 * Combined sound call trigger
 */
export function triggerSoundAlert(
  code: string, 
  desk: string, 
  playSpeech: boolean = false, 
  playChime: boolean = true,
  categories?: TicketCategory[]
): void {
  // Guard against calling reset / zero tickets (e.g. 00, 00 GERAL, Senha 0)
  if (!code || code.trim() === '00' || code.trim() === '0' || /^00?\b/i.test(code.trim())) {
    return;
  }
  if (playChime) {
    playChimeSound();
  }
  if (playSpeech) {
    speakTicket(code, desk, categories);
  }
}


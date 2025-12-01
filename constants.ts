
export const BOARD_SIZE = 8;
export const INITIAL_UNDOS = 3;
export const INITIAL_HINTS = 3;

// TURKISH: 16 pieces per side, rows 1,2 (Black) and 5,6 (White).
export const TURKISH_BLACK_ROWS = [1, 2];
export const TURKISH_WHITE_ROWS = [5, 6];

// DIAGONAL: 12 pieces per side, rows 0,1,2 (Black) and 5,6,7 (White).
export const DIAGONAL_BLACK_ROWS = [0, 1, 2];
export const DIAGONAL_WHITE_ROWS = [5, 6, 7];

export const DIRECTIONS = {
  UP: { r: -1, c: 0 },
  DOWN: { r: 1, c: 0 },
  LEFT: { r: 0, c: -1 },
  RIGHT: { r: 0, c: 1 },
};

export const DIAGONALS = {
  UL: { r: -1, c: -1 },
  UR: { r: -1, c: 1 },
  DL: { r: 1, c: -1 },
  DR: { r: 1, c: 1 },
};

// --- MODERN THEME COLORS ---
export const GLASS_THEME = {
  bgGradient: 'bg-[radial-gradient(circle_at_25%_15%,_#111827_0%,_#0d1426_45%,_#0a101d_100%)] from-[#111827] via-[#0d1426] to-[#0a101d]',
  panel: 'bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl',
  panelLight: 'bg-white/10 backdrop-blur-md border border-white/10',
  textMain: 'text-slate-100',
  textMuted: 'text-slate-400',
  accent: 'text-indigo-400',
  accentBg: 'bg-indigo-600',
  boardBase: 'bg-[#1e293b]', // Slate-800
  boardSquareDark: 'bg-[#0f172a]', // Slate-900
  boardSquareLight: 'bg-[#334155]', // Slate-700
};

// --- SOUND ENGINE ---
class SoundEngine {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playClick() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.05);
    
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  playMove() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    // Low sine wave for a "thock" sound
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  playCapture() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    // Punchier sound
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.2);
    
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  playWin() {
    this.init();
    if (!this.ctx) return;
    // Simple arpeggio
    const now = this.ctx.currentTime;
    [440, 554, 659, 880].forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.1, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.4);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.5);
    });
  }
}

export const soundEngine = new SoundEngine();

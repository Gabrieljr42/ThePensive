"use client";

/** Audio is synthesized only after an explicit user gesture; no media is fetched. */
export class ArchiveAmbience {
  private context: AudioContext | null = null;
  private gain: GainNode | null = null;
  async start(volume: number) {
    if (this.context) {
      await this.context.resume();
      this.setVolume(volume);
      return;
    }
    const context = new AudioContext();
    this.context = context;
    const gain = context.createGain();
    gain.gain.value = 0;
    gain.connect(context.destination);
    this.gain = gain;
    const buffer = context.createBuffer(
      1,
      context.sampleRate * 4,
      context.sampleRate,
    );
    const samples = buffer.getChannelData(0);
    let seed = 173;
    for (let i = 0; i < samples.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      samples[i] = ((seed / 4294967296) * 2 - 1) * 0.15;
    }
    const noise = context.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const lowpass = context.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 320;
    noise.connect(lowpass);
    lowpass.connect(gain);
    noise.start();
    for (const frequency of [146.83, 196]) {
      const oscillator = context.createOscillator();
      const voice = context.createGain();
      oscillator.frequency.value = frequency;
      voice.gain.value = 0.018;
      oscillator.connect(voice);
      voice.connect(gain);
      oscillator.start();
    }
    await context.resume();
    this.setVolume(volume);
  }
  setVolume(volume: number) {
    if (this.context && this.gain)
      this.gain.gain.setTargetAtTime(
        volume * 0.3,
        this.context.currentTime,
        0.3,
      );
  }
  play(event: "stir" | "question" | "evidence") {
    const context = this.context;
    if (!context || context.state !== "running" || !this.gain) return;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const start = context.currentTime;
    const frequency =
      event === "stir" ? 392 : event === "question" ? 261.63 : 329.63;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(
      frequency * 0.7,
      start + 0.65,
    );
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(0.11, start + 0.04);
    envelope.gain.exponentialRampToValueAtTime(0.001, start + 0.75);
    oscillator.connect(envelope);
    envelope.connect(this.gain);
    oscillator.start();
    oscillator.stop(start + 0.8);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
    };
  }
  async visibility(hidden: boolean) {
    if (!this.context) return;
    if (hidden) await this.context.suspend();
    else await this.context.resume();
  }
  async stop() {
    const context = this.context;
    this.context = null;
    this.gain = null;
    if (context && context.state !== "closed") await context.close();
  }
}

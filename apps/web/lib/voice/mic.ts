"use client";

/**
 * A microphone level meter for the live waveform and the "too noisy" warning (spec 11.5), with echo cancellation and
 * noise suppression on. Android Chrome gives the microphone to the recognizer alone, so the meter is skipped there
 * and the view falls back to a listening animation.
 */
export class MicMeter {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private raf = 0;
  level = 0;
  /** A slow-moving floor of the room's noise. */
  floor = 0.01;

  static worthTrying(): boolean {
    // Android gives the microphone to the recognizer alone. On iPhone an open microphone switches the audio to
    // play-and-record, which silences the customer's voice or sends it to the quiet earpiece: no meter there either.
    return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  async start(onLevel: (level: number, noisy: boolean) => void): Promise<boolean> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      this.ctx = new AudioContext();
      const source = this.ctx.createMediaStreamSource(this.stream);
      const analyser = this.ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const data = new Float32Array(analyser.fftSize);
      const tick = () => {
        analyser.getFloatTimeDomainData(data);
        let sum = 0;
        for (const x of data) sum += x * x;
        const rms = Math.sqrt(sum / data.length);
        this.level = Math.min(1, rms * 8);
        // The floor follows quiet stretches quickly and loud ones slowly.
        this.floor = rms < this.floor ? rms : this.floor * 0.999 + rms * 0.001;
        onLevel(this.level, this.floor > 0.06);
        this.raf = requestAnimationFrame(tick);
      };
      tick();
      return true;
    } catch {
      this.stop();
      return false;
    }
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.ctx?.close().catch(() => undefined);
    this.stream = null;
    this.ctx = null;
    this.level = 0;
  }
}

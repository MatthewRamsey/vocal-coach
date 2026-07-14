'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { detectPitchYin } from '../lib/pitch-analysis.mjs';

export function usePitchCoach() {
  const [state, setState] = useState({ active: false, demo: false, error: '', pitch: null, confidence: 0, rms: 0 });
  const engine = useRef({ context: null, stream: null, analyser: null, raf: null, timer: null, onFrame: null });

  const stop = useCallback(() => {
    if (engine.current.raf) cancelAnimationFrame(engine.current.raf);
    if (engine.current.timer) clearInterval(engine.current.timer);
    engine.current.stream?.getTracks().forEach((track) => track.stop());
    engine.current.context?.close();
    engine.current = { context: null, stream: null, analyser: null, raf: null, timer: null, onFrame: null };
    setState((current) => ({ ...current, active: false, pitch: null, confidence: 0, rms: 0 }));
  }, []);

  const start = useCallback(async (demo = false, onFrame, demoFrequency = 261.63) => {
    stop();
    engine.current.onFrame = onFrame;
    if (demo) {
      let tick = 0;
      setState({ active: true, demo: true, error: '', pitch: demoFrequency * 0.994, confidence: 0.94, rms: 0.18 });
      engine.current.timer = setInterval(() => {
        tick += 1;
        const pitch = demoFrequency * Math.pow(2, (Math.sin(tick / 7) * 8 + Math.max(0, 12 - tick)) / 1200);
        const frame = { pitch, confidence: 0.94, rms: 0.18, timestamp: performance.now() };
        setState({ active: true, demo: true, error: '', ...frame });
        engine.current.onFrame?.(frame);
      }, 50);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const context = new AudioContext({ latencyHint: 'interactive' });
      const analyser = context.createAnalyser();
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0;
      context.createMediaStreamSource(stream).connect(analyser);
      const buffer = new Float32Array(analyser.fftSize);
      engine.current = { ...engine.current, context, stream, analyser };
      setState({ active: true, demo: false, error: '', pitch: null, confidence: 0, rms: 0 });
      let lastRun = 0;
      const loop = (time) => {
        if (time - lastRun >= 32) {
          analyser.getFloatTimeDomainData(buffer);
          const result = detectPitchYin(buffer, context.sampleRate, { minFrequency: 65, maxFrequency: 1050 });
          const frame = { ...result, timestamp: time };
          setState({ active: true, demo: false, error: '', ...frame });
          engine.current.onFrame?.(frame);
          lastRun = time;
        }
        engine.current.raf = requestAnimationFrame(loop);
      };
      engine.current.raf = requestAnimationFrame(loop);
    } catch (cause) {
      setState({ active: false, demo: false, error: 'Microphone access is unavailable. Check permission and try again.', pitch: null, confidence: 0, rms: 0 });
      throw cause;
    }
  }, [stop]);

  const playTone = useCallback(async (frequency) => {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    gain.gain.setValueAtTime(0, context.currentTime);
    gain.gain.linearRampToValueAtTime(0.12, context.currentTime + 0.04);
    gain.gain.setValueAtTime(0.12, context.currentTime + 0.7);
    gain.gain.linearRampToValueAtTime(0, context.currentTime + 0.9);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(); oscillator.stop(context.currentTime + 0.92);
    await new Promise((resolve) => setTimeout(resolve, 950));
    await context.close();
  }, []);

  useEffect(() => stop, [stop]);
  return { ...state, start, stop, playTone };
}

export const NOTE_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
export const midiToFrequency = (midi, tuning = 440) => tuning * 2 ** ((midi - 69) / 12);
export const frequencyToMidi = (frequency, tuning = 440) => 69 + 12 * Math.log2(frequency / tuning);
export const midiToNote = (midi) => `${NOTE_NAMES[((Math.round(midi) % 12) + 12) % 12]}${Math.floor(Math.round(midi) / 12) - 1}`;
export const centsBetween = (frequency, target) => 1200 * Math.log2(frequency / target);

export function detectPitchYin(buffer, sampleRate, { minFrequency = 65, maxFrequency = 1050, threshold = 0.15 } = {}) {
  let sum = 0;
  for (const sample of buffer) sum += sample * sample;
  const rms = Math.sqrt(sum / buffer.length);
  if (rms < 0.008) return { pitch: null, confidence: 0, rms };
  const minLag = Math.max(2, Math.floor(sampleRate / maxFrequency));
  const maxLag = Math.min(Math.floor(sampleRate / minFrequency), Math.floor(buffer.length / 2));
  const difference = new Float64Array(maxLag + 1);
  for (let lag = 1; lag <= maxLag; lag += 1) {
    let value = 0;
    for (let index = 0; index < buffer.length - maxLag; index += 1) {
      const delta = buffer[index] - buffer[index + lag];
      value += delta * delta;
    }
    difference[lag] = value;
  }
  const normalized = new Float64Array(maxLag + 1);
  normalized[0] = 1;
  let running = 0;
  for (let lag = 1; lag <= maxLag; lag += 1) {
    running += difference[lag];
    normalized[lag] = running ? (difference[lag] * lag) / running : 1;
  }
  let lag = -1;
  for (let candidate = minLag; candidate <= maxLag; candidate += 1) {
    if (normalized[candidate] < threshold) {
      while (candidate + 1 <= maxLag && normalized[candidate + 1] < normalized[candidate]) candidate += 1;
      lag = candidate; break;
    }
  }
  if (lag < 0) {
    let best = minLag;
    for (let candidate = minLag + 1; candidate <= maxLag; candidate += 1) if (normalized[candidate] < normalized[best]) best = candidate;
    if (normalized[best] > 0.35) return { pitch: null, confidence: 0, rms };
    lag = best;
  }
  const left = normalized[lag - 1] ?? normalized[lag];
  const center = normalized[lag];
  const right = normalized[lag + 1] ?? normalized[lag];
  const denominator = 2 * (2 * center - right - left);
  const refinedLag = denominator ? lag + (right - left) / denominator : lag;
  return { pitch: sampleRate / refinedLag, confidence: Math.max(0, Math.min(1, 1 - center)), rms };
}

const median = (values) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

export function buildSessionSummary(frames, { minimumConfidence = 0.72, inTuneCents = 25 } = {}) {
  const voiced = frames.filter((frame) => frame.pitch && frame.confidence >= minimumConfidence && Number.isFinite(frame.cents));
  const absolute = voiced.map((frame) => Math.abs(frame.cents));
  const medianAbsoluteCents = median(absolute);
  const inTunePercent = voiced.length ? Math.round((absolute.filter((value) => value <= inTuneCents).length / voiced.length) * 100) : 0;
  if (voiced.length < 5) return { label: 'Not enough clear audio', coaching: 'Try again with one steady vowel and less background noise.', medianAbsoluteCents: null, inTunePercent: 0, scoredFrames: voiced.length };
  const rounded = Math.round(medianAbsoluteCents);
  if (rounded <= 20 && inTunePercent >= 70) return { label: 'Nicely centered', coaching: 'You found the note consistently. Move to the next step when it feels easy.', medianAbsoluteCents: rounded, inTunePercent, scoredFrames: voiced.length };
  return { label: 'Good information to work with', coaching: 'Listen once more, enter gently, and aim for the center before adding volume.', medianAbsoluteCents: rounded, inTunePercent, scoredFrames: voiced.length };
}

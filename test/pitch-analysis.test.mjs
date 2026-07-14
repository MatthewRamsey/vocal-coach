import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNaturalNoteScale, buildSessionSummary, centsBetween, detectPitchYin, midiToFrequency, midiToNote } from '../app/lib/pitch-analysis.mjs';

const sine = (frequency, sampleRate = 48000, length = 4096, amplitude = 0.3) => Float32Array.from({ length }, (_, index) => amplitude * Math.sin(2 * Math.PI * frequency * index / sampleRate));

test('converts MIDI notes and frequencies', () => { assert.equal(midiToNote(60), 'C4'); assert.ok(Math.abs(midiToFrequency(69) - 440) < 0.001); assert.ok(Math.abs(centsBetween(466.1638, 440) - 100) < 0.01); });
test('builds all seven natural notes across multiple octaves', () => { assert.deepEqual(buildNaturalNoteScale(2).map(midiToNote), ['C2', 'D2', 'E2', 'F2', 'G2', 'A2', 'B2']); assert.deepEqual(buildNaturalNoteScale(5).map(midiToNote), ['C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5']); assert.throws(() => buildNaturalNoteScale(3.5), RangeError); });
test('YIN detects a sung-range sine within two cents', () => { const result = detectPitchYin(sine(220), 48000); assert.ok(result.pitch); assert.ok(Math.abs(centsBetween(result.pitch, 220)) < 2); assert.ok(result.confidence > 0.9); });
test('YIN rejects silence instead of inventing a pitch', () => { assert.deepEqual(detectPitchYin(new Float32Array(4096), 48000), { pitch: null, confidence: 0, rms: 0 }); });
test('summary excludes low-confidence frames', () => { const frames = Array.from({ length: 10 }, (_, i) => ({ pitch: 261, cents: i < 8 ? 10 : 500, confidence: i < 8 ? .9 : .2 })); const summary = buildSessionSummary(frames); assert.equal(summary.scoredFrames, 8); assert.equal(summary.inTunePercent, 100); assert.equal(summary.label, 'Nicely centered'); });
test('summary handles insufficient clear audio honestly', () => { const summary = buildSessionSummary([{ pitch: 220, cents: 4, confidence: .9 }]); assert.equal(summary.label, 'Not enough clear audio'); assert.equal(summary.medianAbsoluteCents, null); });

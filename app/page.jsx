'use client';

import { useMemo, useState } from 'react';
import { usePitchCoach } from './hooks/usePitchCoach';
import {
  buildNaturalNoteScale,
  buildSessionSummary,
  centsBetween,
  frequencyToMidi,
  midiToFrequency,
  midiToNote
} from './lib/pitch-analysis.mjs';

const OCTAVES = [2, 3, 4, 5];

const feedbackFor = (confidence, cents, active) => {
  if (!active) return { title: 'Ready when you are', detail: 'Hear the note, then start singing.', tone: 'idle' };
  if (confidence < 0.72) return { title: 'Listening for a clear tone', detail: 'Sing one steady vowel a comfortable distance from the microphone.', tone: 'idle' };
  const distance = Math.abs(cents);
  if (distance <= 20) return { title: 'Centered', detail: 'That is in tune. Keep the tone easy and steady.', tone: 'good' };
  if (cents < 0) return { title: 'A little flat', detail: `Lift the pitch about ${Math.round(distance)} cents.`, tone: 'low' };
  return { title: 'A little sharp', detail: `Relax the pitch about ${Math.round(distance)} cents.`, tone: 'high' };
};

export default function Home() {
  const [octave, setOctave] = useState(4);
  const [targetMidi, setTargetMidi] = useState(60);
  const [step, setStep] = useState(0);
  const [frames, setFrames] = useState([]);
  const [summary, setSummary] = useState(null);
  const [tonePlaying, setTonePlaying] = useState(false);
  const { active, error, demo, pitch, confidence, rms, start, stop, playTone } = usePitchCoach();
  const exercise = useMemo(() => buildNaturalNoteScale(octave), [octave]);
  const targetHz = midiToFrequency(targetMidi);
  const cents = pitch ? centsBetween(pitch, targetHz) : 0;
  const feedback = feedbackFor(confidence, cents, active);
  const note = pitch ? midiToNote(frequencyToMidi(pitch)) : '—';
  const meterPosition = Math.max(0, Math.min(100, 50 + cents / 2));

  const recent = useMemo(() => frames.slice(-100), [frames]);

  const begin = async (useDemo = false) => {
    setFrames([]);
    setSummary(null);
    await start(useDemo, (frame) => {
      const frameCents = frame.pitch ? centsBetween(frame.pitch, midiToFrequency(targetMidi)) : null;
      setFrames((current) => [...current.slice(-599), { ...frame, cents: frameCents }]);
    }, targetHz);
  };

  const finish = () => {
    stop();
    setSummary(buildSessionSummary(frames));
  };

  const selectStep = (index) => {
    if (active) stop();
    setStep(index);
    setTargetMidi(exercise[index]);
    setFrames([]);
    setSummary(null);
  };

  const selectOctave = (nextOctave) => {
    if (active) stop();
    setOctave(nextOctave);
    setTargetMidi(buildNaturalNoteScale(nextOctave)[step]);
    setFrames([]);
    setSummary(null);
  };

  const hearTarget = async () => {
    setTonePlaying(true);
    await playTone(targetHz);
    setTonePlaying(false);
  };

  return (
    <main>
      <nav className="nav"><div className="brand"><span>V</span> Vocal Coach</div><div className="privacy">Private · analysis stays on your device</div></nav>

      <header className="hero">
        <div><p className="eyebrow">PITCH PRACTICE · LESSON 1</p><h1>Find the center<br />of every note.</h1><p className="lede">Hear a target, sing it back, and get feedback you can trust—measured against the note you intended to sing.</p></div>
        <div className="lesson-progress"><span>Natural-note scale · Octave {octave}</span><strong>{step + 1} / {exercise.length}</strong><div className="progress"><i style={{ width: `${((step + 1) / exercise.length) * 100}%` }} /></div></div>
      </header>

      <section className="practice-shell">
        <div className="target-panel">
          <p className="label">TARGET NOTE</p>
          <div className="target-note">{midiToNote(targetMidi)}</div>
          <div className="target-hz">{targetHz.toFixed(1)} Hz</div>
          <button className="hear" onClick={hearTarget} disabled={tonePlaying}>{tonePlaying ? 'Playing…' : '▶  Hear target'}</button>
          <div className="octave-picker" aria-label="Practice octave">
            <span>Choose octave</span>
            <div>{OCTAVES.map((value) => <button key={value} className={value === octave ? 'active' : ''} onClick={() => selectOctave(value)} aria-pressed={value === octave}>Oct {value}</button>)}</div>
          </div>
          <div className="steps" aria-label="Exercise notes">{exercise.map((midi, index) => <button key={midi} className={index === step ? 'active' : ''} onClick={() => selectStep(index)} aria-label={`Practice ${midiToNote(midi)}`}>{midiToNote(midi)}</button>)}</div>
          <p className="range-help">All natural notes, A through G · C2–B5. Choose only notes that feel comfortable.</p>
        </div>

        <div className="tuner-panel">
          <div className="live-row"><span className={`live-dot ${active ? 'on' : ''}`} />{active ? (demo ? 'DEMO SIGNAL' : 'MICROPHONE LIVE') : 'MICROPHONE OFF'}<span className="confidence">Signal {Math.round(confidence * 100)}%</span></div>
          <div className="detected-note">{note}</div>
          <div className="detected-hz">{pitch ? `${pitch.toFixed(1)} Hz` : 'Sing the target note'}</div>
          <div className="tuner" aria-label="Pitch tuner"><div className="ticks"><span>-100</span><span>-50</span><span>0</span><span>+50</span><span>+100</span></div><div className="track"><i className="sweet-spot" /><b style={{ left: `${meterPosition}%` }} /></div></div>
          <div className={`feedback ${feedback.tone}`}><strong>{feedback.title}</strong><span>{feedback.detail}</span></div>
          <div className="actions">{!active ? <><button className="primary" onClick={() => begin(false)}>Start microphone</button><button className="secondary" onClick={() => begin(true)}>Try demo</button></> : <button className="primary stop" onClick={finish}>Finish attempt</button>}</div>
          {error && <p className="error" role="alert">{error}</p>}
        </div>
      </section>

      <section className="evidence-grid">
        <article><p className="label">PITCH TRACE</p><h2>Your last few seconds</h2><div className="trace" aria-label="Recent pitch trace">{recent.length ? recent.map((frame, index) => frame.cents == null ? null : <i key={index} style={{ left: `${index}%`, bottom: `${Math.max(3, Math.min(97, 50 - frame.cents / 2))}%` }} />) : <div className="empty">Your pitch trail will appear here.</div>}<span className="center-line" /></div></article>
        <article><p className="label">WHAT WE MEASURE</p><h2>Simple, honest feedback</h2><ul><li><b>Pitch center</b><span>Distance from the target in cents</span></li><li><b>Stability</b><span>How consistently you hold the center</span></li><li><b>Signal confidence</b><span>Only clear voiced frames are scored</span></li></ul></article>
      </section>

      {summary && <section className="results" aria-label="Attempt results"><div><p className="label">ATTEMPT COMPLETE</p><h2>{summary.label}</h2><p>{summary.coaching}</p></div><div className="result-stat"><strong>{summary.medianAbsoluteCents == null ? '—' : `${summary.medianAbsoluteCents}¢`}</strong><span>median error</span></div><div className="result-stat"><strong>{summary.inTunePercent}%</strong><span>frames in tune</span></div><button className="primary" onClick={() => begin(demo)}>Try again</button></section>}

      <footer><button disabled={step === 0} onClick={() => selectStep(step - 1)}>← Previous</button><p>Use a comfortable “ah” vowel. Stop if anything feels strained.</p><button disabled={step === exercise.length - 1} onClick={() => selectStep(step + 1)}>Next note →</button></footer>
    </main>
  );
}

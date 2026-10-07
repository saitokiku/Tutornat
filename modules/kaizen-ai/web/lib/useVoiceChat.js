'use client';

// Hands-free voice loop for the tutor chat (audit MAINT-001 — extracted from
// StudySession.js so the 700-line component splits along its natural seam).
// OpenAI-only by design: MediaRecorder + WebAudio VAD → /api/voice/transcribe
// (Whisper) for input, /api/voice (TTS) for output. No browser speech APIs.
//
// Usage:
//   const voice = useVoiceChat({ onTranscript: (text) => send(text) });
//   voice.{voiceOn,listening,transcribing,speaking,voiceError,setVoiceError,
//          toggleVoice,speak,voiceOnRef}

import { useState, useRef, useEffect, useCallback } from 'react';
import { limitedFetch } from '@/lib/limits';
import { logEvent } from '@/lib/devlog';
import { speakable } from '@/lib/speech';

export function useVoiceChat({ onTranscript }) {
  const [voiceOn, setVoiceOn] = useState(false);
  const [listening, setListening] = useState(false);       // recording the mic
  const [transcribing, setTranscribing] = useState(false); // Whisper in flight
  const [speaking, setSpeaking] = useState(false);         // TTS playing
  const [voiceError, setVoiceError] = useState('');

  const audioRef = useRef(null);          // TTS playback element
  const voiceOnRef = useRef(false);
  const speakingRef = useRef(false);
  const streamRef = useRef(null);         // mic MediaStream (reused across turns)
  const recorderRef = useRef(null);       // MediaRecorder
  const audioCtxRef = useRef(null);       // AudioContext for silence detection
  const vadTimerRef = useRef(null);       // VAD poll interval
  const chunksRef = useRef([]);           // recorded audio chunks
  const startListeningRef = useRef(() => {});
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => { voiceOnRef.current = voiceOn; }, [voiceOn]);

  // ── TTS (OpenAI only — no browser speech synthesis fallback) ───────────────
  const speak = useCallback(async (text) => {
    const clean = speakable(text);
    if (!clean) { if (voiceOnRef.current) startListeningRef.current(); return; }
    setSpeaking(true);
    speakingRef.current = true;
    const onDone = () => {
      setSpeaking(false);
      speakingRef.current = false;
      if (voiceOnRef.current) startListeningRef.current();
    };
    try {
      const res = await limitedFetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean }),
      });
      if (!res.ok) throw new Error('tts unavailable');
      const blob = await res.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      audioRef.current = audio;
      audio.onended = onDone;
      audio.onerror = onDone;
      logEvent('llm', 'Speaking (OpenAI TTS)', `${clean.length} chars`);
      await audio.play();
    } catch {
      logEvent('llm', 'TTS unavailable', 'OpenAI voice not reachable — continuing without audio');
      setVoiceError('Voice replies aren’t available right now — I’ll keep going in text.');
      onDone();
    }
  }, []);

  // ── STT: record with MediaRecorder, end-of-speech via RMS silence ──────────
  const startListening = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
    if (speakingRef.current) return;

    try {
      if (!streamRef.current) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
    } catch {
      setVoiceError('Microphone access is needed for voice mode.');
      setVoiceOn(false); voiceOnRef.current = false;
      return;
    }
    const stream = streamRef.current;

    let mime = '';
    for (const m of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(m)) { mime = m; break; }
    }

    let rec;
    try {
      rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    } catch {
      setVoiceError('This browser cannot record audio for voice mode.');
      setVoiceOn(false); voiceOnRef.current = false;
      return;
    }
    recorderRef.current = rec;
    chunksRef.current = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };

    const ctx = new (window.AudioContext || /** @type {any} */ (window).webkitAudioContext)();
    audioCtxRef.current = ctx;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const buf = new Uint8Array(analyser.frequencyBinCount);

    let sawSpeech = false;
    let silenceMs = 0;
    const startedAt = Date.now();
    const TICK = 100;
    const SILENCE_HANGOVER = 1100;   // stop this long after speech ends
    const MAX_UTTERANCE = 20000;     // hard cap per turn
    const NO_SPEECH_TIMEOUT = 8000;  // give up if nothing is said

    rec.onstop = async () => {
      if (vadTimerRef.current) { clearInterval(vadTimerRef.current); vadTimerRef.current = null; }
      try { ctx.close(); } catch { /* noop */ }
      audioCtxRef.current = null;
      setListening(false);

      const blob = new Blob(chunksRef.current, { type: mime || 'audio/webm' });
      chunksRef.current = [];

      if (!sawSpeech || blob.size < 1200) {
        if (voiceOnRef.current && !speakingRef.current) setTimeout(() => startListeningRef.current(), 250);
        return;
      }

      setTranscribing(true);
      try {
        const fd = new FormData();
        fd.append('audio', blob, 'speech.webm');
        const res = await limitedFetch('/api/voice/transcribe', { method: 'POST', body: fd });
        const data = await res.json().catch(() => ({}));
        const text = String(data?.text || '').trim();
        setTranscribing(false);
        if (!res.ok) throw new Error(data?.error || 'transcription failed');
        if (text && voiceOnRef.current) {
          logEvent('input', 'Voice transcript (Whisper)', text.slice(0, 60));
          onTranscriptRef.current?.(text);
        } else if (voiceOnRef.current) {
          setTimeout(() => { if (voiceOnRef.current && !speakingRef.current) startListeningRef.current(); }, 300);
        }
      } catch {
        setTranscribing(false);
        setVoiceError('I didn’t catch that — mind trying again?');
        if (voiceOnRef.current) setTimeout(() => startListeningRef.current(), 800);
      }
    };

    setListening(true);
    setVoiceError('');
    try { rec.start(); } catch { setListening(false); return; }

    vadTimerRef.current = setInterval(() => {
      if (rec.state !== 'recording') return;
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
      const rms = Math.sqrt(sum / buf.length);
      const elapsed = Date.now() - startedAt;

      if (rms > 0.045) { sawSpeech = true; silenceMs = 0; }
      else if (sawSpeech) { silenceMs += TICK; }

      const done =
        (sawSpeech && silenceMs >= SILENCE_HANGOVER) ||
        elapsed >= MAX_UTTERANCE ||
        (!sawSpeech && elapsed >= NO_SPEECH_TIMEOUT);
      if (done) { try { rec.stop(); } catch { /* noop */ } }
    }, TICK);
  }, []);
  startListeningRef.current = startListening;

  const stopVoice = useCallback(() => {
    if (vadTimerRef.current) { clearInterval(vadTimerRef.current); vadTimerRef.current = null; }
    try { if (recorderRef.current?.state === 'recording') recorderRef.current.stop(); } catch { /* noop */ }
    try { audioCtxRef.current?.close(); } catch { /* noop */ }
    audioCtxRef.current = null;
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* noop */ }
    streamRef.current = null;
    try { audioRef.current?.pause(); } catch { /* noop */ }
    setListening(false);
    setTranscribing(false);
    setSpeaking(false);
    speakingRef.current = false;
  }, []);

  const toggleVoice = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setVoiceError('Voice needs a modern browser (Chrome, Edge, or Safari) with microphone access.');
      return;
    }
    if (voiceOnRef.current) {
      setVoiceOn(false);
      voiceOnRef.current = false;
      stopVoice();
    } else {
      setVoiceOn(true);
      voiceOnRef.current = true;
      setVoiceError('');
      logEvent('input', 'Voice mode on', 'OpenAI Whisper STT + OpenAI TTS');
      startListening();
    }
  }, [startListening, stopVoice]);

  // Tear down mic + audio graph on unmount.
  useEffect(() => () => {
    voiceOnRef.current = false;
    if (vadTimerRef.current) clearInterval(vadTimerRef.current);
    try { if (recorderRef.current?.state === 'recording') recorderRef.current.stop(); } catch { /* noop */ }
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* noop */ }
    try { audioCtxRef.current?.close(); } catch { /* noop */ }
    try { audioRef.current?.pause(); } catch { /* noop */ }
  }, []);

  return { voiceOn, listening, transcribing, speaking, voiceError, setVoiceError, toggleVoice, speak, voiceOnRef };
}

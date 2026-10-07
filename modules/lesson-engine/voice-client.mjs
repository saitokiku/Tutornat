// Opt-in voice for ONE learner turn. Mic only, camera never. Local-only or off.
//
// What this module will and will not do:
//   - getUserMedia runs on a Record CLICK and nowhere else. Importing this file,
//     mounting it, or re-rendering the lesson never opens a device.
//   - Two on-device transcription routes, in this order, and NOTHING else:
//       1. capabilities.localTranscription===true -> upload to the SAME-ORIGIN
//          /api/transcribe, decoded by voice.mjs with a local Whisper subprocess.
//       2. otherwise, the browser's own on-device recognizer: Chrome 153 exposes
//          SpeechRecognition.available({langs,processLocally:true}) and .install().
//          The DEFAULT for SpeechRecognition is CLOUD, so this route is taken only
//          when available() says the on-device pack is there or installable, the
//          learner explicitly downloads it, and the instance really accepts
//          processLocally=true (verified by reading it back before start()).
//     There is no third route. Cloud speech recognition is never started, not as a
//     fallback and not after a failure — that would be a silent privacy regression,
//     not a fallback. With neither route the control stays explicitly OFF and typing
//     remains the whole answer path.
//   - Playback is speechSynthesis with a localService voice only, started by an
//     explicit Listen click. Never autoplay, never a remote voice.
//   - A transcript lands in an editable draft. Submitting is always the learner's
//     separate, deliberate act — the module has no submit path at all.
//
// onEvent/onError take typed slugs so a caller can count turns without ever
// receiving learner audio or learner words.

const MAX_MS = 30_000;              // hard cap on one turn
const MAX_BYTES = 1024 * 1024;      // matches voice.mjs; refuse before uploading
const VOICES_WAIT_MS = 1500;        // Chrome reports [] until voiceschanged fires

const COPY = {
  en: {
    legend: 'Answer out loud (optional)',
    record: 'Record', stop: 'Stop', cancel: 'Cancel',
    listen: 'Listen', listenStop: 'Stop reading',
    draft: 'What we heard — edit it, then answer as usual',
    idle: 'Typing works the same. Recording is yours to start and stop.',
    recording: 'Recording. Press Stop when you are done.',
    working: 'Reading your recording on this computer.',
    done: 'Edit anything that came out wrong, then answer as usual.',
    off: 'Speaking out loud is not available on this computer. Type your answer instead.',
    denied: 'The microphone was not allowed. Type your answer instead.',
    missing: 'No microphone was found. Type your answer instead.',
    codec: 'This browser cannot record audio here. Type your answer instead.',
    tooLong: 'That recording was too long to read. Try a shorter one, or type your answer.',
    network: 'The recording could not be sent. Type your answer instead.',
    server: 'Reading the recording did not work. Type your answer instead.',
    nospeech: 'No speech was heard in that recording. Try again, or type your answer.',
    speakOff: 'Reading aloud needs a voice installed on this computer. Read it on screen instead.',
    install: 'Download the speech pack',
    installNeed: 'Speaking out loud needs a one-time speech download. It then runs on this computer and your voice is not sent anywhere.',
    installing: 'Downloading the speech pack. This happens once.',
    installed: 'Ready. Recording runs on this computer.',
    packFailed: 'The speech download did not finish, so speaking out loud stays off. Type your answer instead.',
    ondeviceRefused: 'This browser will not keep speech on this computer, so recording stays off. Type your answer instead.',
  },
  es: {
    legend: 'Responder en voz alta (opcional)',
    record: 'Grabar', stop: 'Detener', cancel: 'Cancelar',
    listen: 'Escuchar', listenStop: 'Dejar de leer',
    draft: 'Lo que escuchamos: edítelo y luego responda como siempre',
    idle: 'Escribir funciona igual. Usted decide cuándo grabar y cuándo parar.',
    recording: 'Grabando. Presione Detener cuando termine.',
    working: 'Leyendo su grabación en esta computadora.',
    done: 'Corrija lo que haya salido mal y luego responda como siempre.',
    off: 'Hablar en voz alta no está disponible en esta computadora. Escriba su respuesta.',
    denied: 'No se permitió el micrófono. Escriba su respuesta.',
    missing: 'No se encontró ningún micrófono. Escriba su respuesta.',
    codec: 'Este navegador no puede grabar audio aquí. Escriba su respuesta.',
    tooLong: 'La grabación fue demasiado larga para leerla. Intente una más corta o escriba su respuesta.',
    network: 'No se pudo enviar la grabación. Escriba su respuesta.',
    server: 'No se pudo leer la grabación. Escriba su respuesta.',
    nospeech: 'No se escuchó nada en esa grabación. Intente de nuevo o escriba su respuesta.',
    speakOff: 'Leer en voz alta necesita una voz instalada en esta computadora. Léalo en la pantalla.',
    install: 'Descargar el paquete de voz',
    installNeed: 'Hablar en voz alta necesita una descarga única. Después funciona en esta computadora y su voz no se envía a ningún lugar.',
    installing: 'Descargando el paquete de voz. Esto ocurre una sola vez.',
    installed: 'Listo. La grabación funciona en esta computadora.',
    packFailed: 'La descarga del paquete de voz no terminó, así que hablar en voz alta sigue desactivado. Escriba su respuesta.',
    ondeviceRefused: 'Este navegador no mantiene la voz en esta computadora, así que la grabación sigue desactivada. Escriba su respuesta.',
  },
};

// BCP-47 tags for the on-device language packs. The lesson locale is 'en'/'es'.
const SR_LANG = { en: 'en-US', es: 'es-ES' };

// Server error name -> our typed code. Anything unlisted is 'server': the response
// body can carry paths and model names, so it is never shown or forwarded.
const SERVER_CODES = new Map([
  ['NoSpeech', 'nospeech'], ['TooLong', 'too-long'], ['PayloadTooLarge', 'too-long'],
  ['UnsupportedMediaType', 'codec'], ['Unsupported', 'codec'],
]);
const CODE_COPY = {
  'mic-denied': 'denied', 'mic-missing': 'missing', codec: 'codec', 'too-long': 'tooLong',
  network: 'network', server: 'server', nospeech: 'nospeech',
  'pack-failed': 'packFailed', 'ondevice-refused': 'ondeviceRefused',
};

// SpeechRecognition error strings -> the same typed codes the upload route uses, so a
// caller counts one kind of failure regardless of which on-device route produced it.
const SR_CODES = new Map([
  ['not-allowed', 'mic-denied'], ['service-not-allowed', 'mic-denied'],
  ['audio-capture', 'mic-missing'], ['no-speech', 'nospeech'],
  ['network', 'network'], ['language-not-supported', 'ondevice-refused'],
]);

function el(tag, attrs = {}, kids = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'text') n.textContent = v;
    else if (k in n && k !== 'list') n[k] = v;
    else n.setAttribute(k, String(v));
  }
  for (const kid of kids) if (kid) n.append(kid);
  return n;
}

/**
 * @param {object} o
 * @param {'en'|'es'} o.locale
 * @param {() => string} [o.getText]      current prompt/explanation, read at Listen time
 * @param {(text: string) => void} [o.onTranscript]  editable draft, never a submission
 * @param {(type: string) => void} [o.onEvent]       typed slug only
 * @param {(code: string) => void} [o.onError]       typed slug only
 * @param {boolean} [o.disabled]
 * @param {{localTranscription?: boolean}} [o.capabilities]
 *        localTranscription===true ONLY when the backend really runs local Whisper.
 *        Absent or false means recording is off — it never means "use the cloud".
 * @returns {{element: HTMLElement, destroy: () => void}}
 */
export function createVoiceControls(o = {}) {
  const locale = o.locale === 'es' ? 'es' : 'en';
  const t = COPY[locale];
  const say = (fn, arg) => { if (!dead && typeof fn === 'function') fn(arg); };
  const emit = (type) => say(o.onEvent, type);
  const oops = (code) => { say(o.onError, code); setStatus(t[CODE_COPY[code]] || t.server); };

  // Route 1: the local Whisper backend. A positive assertion from health, nothing weaker.
  const canUpload = o.capabilities?.localTranscription === true
    && typeof navigator?.mediaDevices?.getUserMedia === 'function'
    && typeof window.MediaRecorder === 'function';
  // Route 2 candidate: the browser's own on-device recognizer. Only consulted when
  // route 1 is absent, and only trusted after available() AND a processLocally readback.
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const srLang = SR_LANG[locale];
  const srPossible = !canUpload && typeof SR === 'function' && typeof SR.available === 'function';
  // Enabled by route 1 immediately, or by route 2 once the pack is confirmed present.
  let canRecord = canUpload;

  let dead = false;
  let stream = null;       // live only between Record and Stop/Cancel
  let recorder = null;
  let chunks = [];
  let capTimer = 0;
  let aborting = false;    // Cancel/destroy: drop whatever the recorder emits
  let utterance = null;
  let voiceTimer = 0;
  let onVoices = null;

  const status = el('p', { class: 'lw-voice-status', role: 'status', 'aria-live': 'polite',
    text: canRecord ? t.idle : (srPossible ? t.installNeed : t.off) });
  const setStatus = (text) => { if (!dead) status.textContent = text; };

  const record = el('button', { type: 'button', id: 'lw-voice-record', class: 'lw-btn lw-voice-rec', text: t.record,
    disabled: !canRecord || o.disabled === true, 'data-cap-ms': String(MAX_MS) });
  const stopBtn = el('button', { type: 'button', id: 'lw-voice-stop', class: 'lw-btn', text: t.stop, disabled: true });
  const cancel = el('button', { type: 'button', id: 'lw-voice-cancel', class: 'lw-btn lw-quiet', text: t.cancel, disabled: true });
  // Rendered only while a real downloadable on-device pack is the thing standing
  // between the learner and recording. Removed once installed, never shown for a
  // route that cannot work.
  const install = el('button', { type: 'button', id: 'lw-voice-install', class: 'lw-btn', text: t.install });
  const listen = el('button', { type: 'button', id: 'lw-voice-listen', class: 'lw-btn', text: t.listen,
    disabled: true, 'data-speaking': 'false' });
  const listenStop = el('button', { type: 'button', id: 'lw-voice-listen-stop', class: 'lw-btn lw-quiet', text: t.listenStop, disabled: true });

  const draftLabel = el('label', { class: 'lw-voice-draft-label', for: 'lw-voice-draft', text: t.draft, hidden: true });
  const draft = el('textarea', { id: 'lw-voice-draft', class: 'lw-input lw-voice-draft', rows: 2, maxlength: 400, hidden: true });

  // Not a <form>: there is no submit path here by construction.
  const element = el('section', { class: 'lw-voice', 'data-state': 'idle', 'aria-label': t.legend }, [
    el('p', { class: 'lw-voice-legend', text: t.legend }),
    // install is appended only once a real downloadable pack is confirmed: a control
    // that cannot work must not be in the DOM at all, hidden or otherwise.
    el('div', { class: 'lw-voice-row', id: 'lw-voice-actions' }, [record, stopBtn, cancel]),
    el('div', { class: 'lw-voice-row' }, [listen, listenStop]),
    status, draftLabel, draft,
  ]);
  const setState = (s) => { if (!dead) element.setAttribute('data-state', s); };

  // ------------------------------------------------------------ recording
  function releaseStream() {
    if (capTimer) { clearTimeout(capTimer); capTimer = 0; }
    if (stream) { for (const track of stream.getTracks()) { try { track.stop(); } catch { /* gone */ } } stream = null; }
    recorder = null; chunks = [];
  }
  function idle() {
    releaseStream();
    record.disabled = !canRecord || o.disabled === true;
    stopBtn.disabled = true; cancel.disabled = true;
    setState('idle');
  }

  // ------------------------------------------------ route 2: on-device recognizer
  let recognizer = null;

  async function probeOnDevice() {
    if (!srPossible) return;
    let statusText;
    try { statusText = await SR.available({ langs: [srLang], processLocally: true }); }
    catch { statusText = 'unavailable'; }       // a browser that throws here has no pack
    if (dead) return;
    if (statusText === 'available') { canRecord = true; idle(); setStatus(t.idle); return; }
    // 'downloading' is treated as 'downloadable': install() resolves when it lands.
    if (statusText === 'downloadable' || statusText === 'downloading') {
      if (typeof SR.install === 'function') {
        element.querySelector('#lw-voice-actions').append(install);
        setStatus(t.installNeed); return;
      }
    }
    setStatus(t.off);                            // 'unavailable', or no install()
  }

  async function installPack() {
    install.disabled = true;
    setStatus(t.installing); emit('pack-install-start');
    let ok2 = false;
    try { ok2 = await SR.install({ langs: [srLang], processLocally: true }); }
    catch { ok2 = false; }
    if (dead) return;
    if (!ok2) {
      // Fail CLOSED. No cloud attempt, no retry loop, recording stays off.
      install.disabled = false;
      canRecord = false; idle();
      oops('pack-failed');
      return;
    }
    install.remove();
    canRecord = true; idle();
    emit('pack-installed'); setStatus(t.installed);
  }

  function startRecognition() {
    let rec;
    try { rec = new SR(); } catch { oops('ondevice-refused'); return; }
    rec.lang = srLang;
    rec.processLocally = true;
    rec.continuous = false;
    rec.interimResults = false;
    // READ IT BACK. A browser that accepts the property but ignores it would
    // transcribe in the cloud; refusing is the only honest branch.
    if (rec.processLocally !== true) { try { rec.abort(); } catch { /* never started */ } oops('ondevice-refused'); return; }
    recognizer = rec;
    aborting = false;
    let text = '';
    rec.onresult = (e) => {
      const list = e?.results?.[e.resultIndex ?? 0];
      const alt = list && list[0];
      if (alt && typeof alt.transcript === 'string') text += alt.transcript;
    };
    rec.onerror = (e) => {
      if (dead || aborting) return;
      aborting = true; recognizer = null; idle();
      oops(SR_CODES.get(e?.error) || 'server');
    };
    rec.onend = () => {
      if (dead || aborting) { recognizer = null; return; }
      recognizer = null; idle();
      const said = text.trim().slice(0, 400);
      if (!said) { oops('nospeech'); return; }
      draft.value = said; draft.hidden = false; draftLabel.hidden = false;
      setState('draft'); setStatus(t.done);
      emit('transcript-ready');
      say(o.onTranscript, said);
    };
    emit('record-start');
    try { rec.start(); } catch { recognizer = null; idle(); oops('ondevice-refused'); return; }
    capTimer = setTimeout(() => { emit('record-capped'); try { rec.stop(); } catch { /* ended */ } }, MAX_MS);
    stopBtn.disabled = false; cancel.disabled = false;
    setState('recording'); setStatus(t.recording);
  }

  function abortRecognition() {
    if (!recognizer) return;
    const rec = recognizer; recognizer = null;
    try { rec.abort(); } catch { /* already ended */ }
  }

  async function startRecording() {
    if (dead || !canRecord || stream || recognizer) return;
    record.disabled = true;
    if (!canUpload) { startRecognition(); return; }
    aborting = false;
    emit('record-start');
    try {
      // video:false is explicit, not omitted: the camera is never requested.
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (err) {
      stream = null;
      if (dead) return;
      idle();
      oops(err?.name === 'NotFoundError' || err?.name === 'OverconstrainedError' ? 'mic-missing' : 'mic-denied');
      return;
    }
    if (dead || aborting) { releaseStream(); return; }   // destroyed while the prompt was up
    try {
      recorder = new MediaRecorder(stream);
    } catch {
      idle(); oops('codec'); return;
    }
    chunks = [];
    // `rec`, not `recorder`: cancel/destroy null the module slot synchronously while
    // onstop is still queued, so the handler must hold its own instance.
    const rec = recorder;
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      const blob = chunks.length ? new Blob(chunks, { type: rec.mimeType || chunks[0].type }) : null;
      releaseStream(); finish(blob);
    };
    rec.onerror = () => { if (aborting) return; aborting = true; idle(); oops('codec'); };
    rec.start();
    capTimer = setTimeout(() => { emit('record-capped'); stopRecording(); }, MAX_MS);
    stopBtn.disabled = false; cancel.disabled = false;
    setState('recording'); setStatus(t.recording);
  }

  function stopRecording() {
    if (recognizer) {
      stopBtn.disabled = true; cancel.disabled = true;
      setState('working'); setStatus(t.working);
      try { recognizer.stop(); } catch { abortRecognition(); idle(); }
      return;
    }
    if (!recorder || recorder.state === 'inactive') { idle(); return; }
    stopBtn.disabled = true; cancel.disabled = true;
    setState('working'); setStatus(t.working);
    try { recorder.stop(); } catch { releaseStream(); idle(); }
  }

  function cancelRecording(typed = 'record-cancel') {
    aborting = true;
    abortRecognition();
    if (recorder && recorder.state !== 'inactive') { try { recorder.stop(); } catch { /* gone */ } }
    releaseStream(); idle();
    if (typed) { emit(typed); setStatus(t.idle); }
  }

  async function finish(blob) {
    if (dead || aborting) return;                       // cancelled or destroyed mid-flush
    if (!blob || !blob.size) { idle(); oops('codec'); return; }
    if (blob.size > MAX_BYTES) { idle(); oops('too-long'); return; }
    emit('transcribe-start');
    let res;
    try {
      res = await fetch(`/api/transcribe?locale=${locale}`, {
        method: 'POST',
        headers: { 'content-type': blob.type, 'x-adult-test': 'true' },
        body: blob,
      });
    } catch {
      if (dead || aborting) return;
      idle(); oops('network'); return;
    }
    if (dead || aborting) return;
    let body = null;
    try { body = await res.json(); } catch { /* typed below */ }
    if (dead || aborting) return;
    if (!res.ok || typeof body?.transcript !== 'string' || !body.transcript.trim()) {
      // body.message can carry a filesystem path or a model name. Never rendered.
      idle(); oops(SERVER_CODES.get(body?.error) || 'server'); return;
    }
    idle();
    const text = body.transcript.trim().slice(0, 400);
    draft.value = text; draft.hidden = false; draftLabel.hidden = false;
    setState('draft'); setStatus(t.done);
    emit('transcript-ready');
    say(o.onTranscript, text);       // a draft for the learner, never a submission
  }

  // ------------------------------------------------------------ playback
  const synth = window.speechSynthesis;
  // localService===true means the voice runs on this machine. A remote voice would
  // ship the lesson text to a vendor, so it is refused rather than used quietly.
  const localVoice = () => (synth?.getVoices?.() || [])
    .filter((v) => v.localService === true)
    .find((v) => String(v.lang || '').toLowerCase().startsWith(locale)) || null;

  function clearVoiceWait() {
    if (voiceTimer) { clearTimeout(voiceTimer); voiceTimer = 0; }
    if (onVoices) { synth?.removeEventListener?.('voiceschanged', onVoices); onVoices = null; }
  }
  function offerListen() {
    if (dead) return false;
    if (!localVoice()) return false;
    listen.disabled = o.disabled === true;
    clearVoiceWait();
    return true;
  }
  function listenUnsupported() {
    if (dead) return;
    clearVoiceWait();
    listen.disabled = true;
    emit('listen-unsupported');
    setStatus(t.speakOff);
  }
  function watchVoices() {
    if (!synth || typeof synth.speak !== 'function') { listenUnsupported(); return; }
    if (offerListen()) return;
    // Chrome answers getVoices() with [] until the list loads. Wait once, bounded.
    onVoices = () => { if (!offerListen()) { /* still none; the timer decides */ } };
    synth.addEventListener?.('voiceschanged', onVoices);
    voiceTimer = setTimeout(() => { if (!offerListen()) listenUnsupported(); }, VOICES_WAIT_MS);
  }

  function speak() {
    const text = (typeof o.getText === 'function' ? o.getText() : '') || '';
    const voice = localVoice();
    if (!text.trim() || !voice) { listenUnsupported(); return; }
    try { synth.cancel(); } catch { /* nothing playing */ }
    utterance = new SpeechSynthesisUtterance(text.slice(0, 1200));
    utterance.voice = voice;
    utterance.lang = voice.lang || locale;
    utterance.onend = () => { if (!dead) { listen.setAttribute('data-speaking', 'false'); listenStop.disabled = true; emit('listen-end'); } };
    utterance.onerror = () => { if (!dead) { listen.setAttribute('data-speaking', 'false'); listenStop.disabled = true; say(o.onError, 'speak-failed'); } };
    listen.setAttribute('data-speaking', 'true'); listenStop.disabled = false;
    emit('listen-start');
    synth.speak(utterance);
  }
  function hush() {
    try { synth?.cancel?.(); } catch { /* nothing playing */ }
    if (!dead) { listen.setAttribute('data-speaking', 'false'); listenStop.disabled = true; }
  }

  record.addEventListener('click', startRecording);
  stopBtn.addEventListener('click', stopRecording);
  cancel.addEventListener('click', () => cancelRecording());
  listen.addEventListener('click', speak);
  listenStop.addEventListener('click', () => { hush(); emit('listen-stop'); });
  draft.addEventListener('input', () => say(o.onTranscript, draft.value));

  install.addEventListener('click', installPack);

  watchVoices();
  probeOnDevice();

  return {
    element,
    destroy() {
      if (dead) return;
      // aborting first: an in-flight upload or a pending recorder flush must find
      // the door already shut rather than call back into a torn-down caller.
      aborting = true; dead = true;
      clearVoiceWait();
      abortRecognition();
      if (recorder && recorder.state !== 'inactive') { try { recorder.stop(); } catch { /* gone */ } }
      releaseStream();
      try { synth?.cancel?.(); } catch { /* nothing playing */ }
      utterance = null;
      element.remove();
    },
  };
}

#!/usr/bin/env python3
"""Local-only speech-to-text for ONE short learner turn. No network, no storage.

Invoked as a subprocess by lesson/voice.mjs:

    voice_bridge.py --audio=/path/to/tmp.webm --locale=en

Reply is always a single JSON object on stdout:
    {"ok": true,  "transcript": "...", "language": "en", "audio_s": 2.65}
    {"ok": false, "error": "<class>", "detail": "<short, sanitised>"}

Guarantees (what makes this honest rather than convenient):
  * LOCAL ONLY. It calls the four local faster-whisper entry points directly
    (tools.transcription_local) and never tools.transcription_tools' generic
    router, which is allowed to fall back to a CLOUD provider. HF_HUB_OFFLINE
    and TRANSFORMERS_OFFLINE are forced on, so a cache miss fails instead of
    silently downloading a model.
  * The caller's locale OVERRIDES the global config language. Config pins "en";
    a Spanish turn would otherwise be transcribed as mangled English.
  * Duration is measured from ACTUALLY DECODED samples, not from container
    metadata, and decoding stops the moment the cap is passed. Metadata is
    attacker-controlled and whisper cost is linear in real audio length.
  * Audio never leaves this process and is never logged. The temp file belongs
    to voice.mjs, which deletes it on every path.
  * Errors are typed classes. A library/provider message never reaches stdout:
    detail is a short fixed string, so no filesystem paths or CUDA/HF internals
    can leak to a browser.
"""
from __future__ import annotations

import contextlib
import io
import json
import os
import sys

# Decode cap. Longer audio is rejected before the model is even loaded.
MAX_AUDIO_SECONDS = 20.0
# stdout stays far under voice.mjs' 16 KiB read cap.
MAX_TRANSCRIPT_CHARS = 2000
LOCALES = ("en", "es")


class Typed(Exception):
    """A failure class the browser is allowed to see, with no library text in it."""

    def __init__(self, error: str, detail: str) -> None:
        super().__init__(detail)
        self.error = error
        self.detail = detail


def _emit(payload: dict) -> None:
    # stdout carries exactly one JSON object; library chatter went to a StringIO.
    sys.stdout.write(json.dumps(payload))
    sys.stdout.flush()


def _decoded_seconds(path: str) -> float:
    """Real duration from decoded samples. Also our malformed-audio gate.

    av is already installed and demuxes webm/ogg/mp4/wav/aiff with opus+aac, so
    there is nothing to convert first. We count samples rather than trusting
    `stream.duration` because a 3-byte file can claim to be an hour long, and
    whisper would then be handed something it has to chew on.
    """
    import av  # noqa: PLC0415 - import cost is paid only when audio is real

    samples = 0
    rate = 0
    try:
        with av.open(path) as container:
            stream = next((s for s in container.streams if s.type == "audio"), None)
            if stream is None:
                raise Typed("Unsupported", "No audio track in that recording.")
            for frame in container.decode(stream):
                rate = rate or int(frame.sample_rate or 0)
                samples += int(frame.samples or 0)
                if rate and samples / rate > MAX_AUDIO_SECONDS:
                    # Stop decoding here: do not pay for the rest of a long file.
                    raise Typed("TooLong", f"Keep it under {int(MAX_AUDIO_SECONDS)} seconds.")
    except Typed:
        raise
    except Exception:
        # av raises a zoo of codec/IO errors carrying paths; none of it is shown.
        raise Typed("Unsupported", "That recording could not be read.") from None
    if not rate or samples <= 0:
        raise Typed("Unsupported", "That recording had no audio in it.")
    return samples / rate


def transcribe(path: str, locale: str) -> dict:
    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "1"

    audio_s = _decoded_seconds(path)

    # Library import + model load write progress/warnings to stdio; our stdout is
    # a one-JSON-object contract, so everything they say is swallowed.
    with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
        try:
            from tools.transcription_local import (
                _join_confident_segments,
                _load_local_whisper_model,
                build_local_transcribe_kwargs,
            )
            from tools.transcription_common import DEFAULT_LOCAL_MODEL
            from tools.transcription_tools import _load_stt_config
        except Exception:
            raise Typed("Unavailable", "Local speech recognition is not installed.") from None

        try:
            # _load_stt_config is read for SETTINGS ONLY (thresholds, vad). We never
            # call the generic transcribe router it belongs to: that one can route to
            # a cloud provider, which would ship a child's voice off this machine.
            cfg = _load_stt_config()
            kwargs = build_local_transcribe_kwargs(cfg)
            # Config pins language globally; the request wins.
            kwargs["language"] = locale
            # int8 on CPU: Apple Silicon has no usable CUDA and float16 on CPU is slower.
            model = _load_local_whisper_model(DEFAULT_LOCAL_MODEL, device="cpu", compute_type="int8")
            segments, info = model.transcribe(path, **kwargs)
            text = _join_confident_segments(segments, cfg.get("local") or {})
        except Exception:
            raise Typed("Unavailable", "Local speech recognition could not run.") from None

    text = (text or "").strip()[:MAX_TRANSCRIPT_CHARS]
    if not text:
        # vad_filter drops silence-only clips to "" — that is "say it again",
        # not a crash, and the caller must be able to tell the two apart.
        raise Typed("NoSpeech", "No speech was heard in that recording.")
    return {"ok": True, "transcript": text, "language": locale,
            "audio_s": round(audio_s, 2),
            "detected_language": getattr(info, "language", None)}


def main() -> int:
    # The managed-runtime launcher prepends its own argv entries (the script stays at
    # argv[1]), so read named flags by prefix instead of a fixed index.
    def flag(name: str) -> str:
        p = f"--{name}="
        return next((a[len(p):] for a in sys.argv[1:] if a.startswith(p)), "")

    path, locale = flag("audio"), flag("locale")
    if locale not in LOCALES or not path or not os.path.isfile(path):
        _emit({"ok": False, "error": "BadRequest", "detail": "Bad audio path or locale."})
        return 2
    try:
        _emit(transcribe(path, locale))
        return 0
    except Typed as exc:
        _emit({"ok": False, "error": exc.error, "detail": exc.detail})
        return 1
    except BaseException:
        # Includes the parent's SIGTERM path. Still no library text on stdout.
        _emit({"ok": False, "error": "Unavailable", "detail": "Local speech recognition failed."})
        return 1


if __name__ == "__main__":
    os.environ.setdefault("HERMES_QUIET", "1")
    raise SystemExit(main())

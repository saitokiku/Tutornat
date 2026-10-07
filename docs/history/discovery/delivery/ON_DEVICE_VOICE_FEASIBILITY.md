# Browser-local speech feasibility — coordinator observation

## Actual read-only browser probe

Installed Chrome for Testing 153 was launched headless through the existing Playwright module against the older local server at http://127.0.0.1:51202/. No microphone permission was requested, no recognition was started, no language pack was installed and no audio was played.

Observed API introspection:
- secureContext: true
- SpeechRecognition or webkitSpeechRecognition: present
- processLocally property: present
- static available() and install(): present
- MediaRecorder and WebGPU: present

Actual `SpeechRecognition.available({langs:[lang],processLocally:true})` results:
- en-US: downloadable
- es-ES: downloadable

This proves presence and downloadable language-pack status in this isolated browser, NOT working recognition, installed packs, transcription accuracy, owner-browser support or microphone capture.

## Official documentation checked

https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API fetched successfully with curl. Its on-device section specifies:
- Default recognition is server-based, so never use the default for the local-only promise.
- Set recognition.processLocally=true before start().
- available() takes langs and processLocally:true; states are unavailable/available/downloadable/downloading.
- install() downloads a one-time language pack; once installed, on-device recognition works offline.
- on-device-speech-recognition Permissions-Policy defaults to self.

## Implementation consequence

The explicit local-only requirement does NOT imply speech must remain unavailable on the Vercel domain. A capability-detected native on-device path is a feasible candidate needing real verification. Preserve existing local Whisper for localhost. For cloud, require processLocally support and fail closed; provide an explicit Download language pack action, then a separate explicit Record action. Never silently fall back to network SpeechRecognition. Handle unsupported, download failure, permission denial, stop, destroy and late-result cleanup. Transcripts stay editable and never auto-submit.

Next evidence needed: an isolated-browser language-pack installation and genuine synthetic-audio transcription through this native path, clearly labeled synthetic and not real-microphone proof. Owner mic/camera/speakers stay unused.

## Contingency only

Official Transformers.js documentation via Context7 (/huggingface/transformers.js) confirms browser Whisper inference and local model controls: env.allowRemoteModels=false, allowLocalModels=true (browser default is false), localModelPath and locally served ONNX assets. This route has NOT been installed or exercised here. Prefer the demonstrated native API first; do not add a large dependency to avoid checking it.

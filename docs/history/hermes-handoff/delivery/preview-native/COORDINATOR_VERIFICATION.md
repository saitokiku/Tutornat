# Coordinator verification — corrected local launcher

## Verified

- `node --check delivery/preview-native/launch.mjs`: exit0.
- `node delivery/preview-native/launch.mjs --check`: exit0;23 refusal cases, with leakage assertions.
- `node delivery/preview-native/test-supervision-opus.mjs`: exit0;6 groups. Child supervision in this script is mocked; the Vercel import sentinel uses a real subprocess.
- Additional coordinator checks used real Node children and grandchildren, not mocks. Both timeout and ASCII stdout-cap breaches produced the expected refusal, SIGKILLed the process group, reaped the parent and left no live descendants. No resolver, credential or provider was used in these checks.
- Stopped tracked old preview `proc_0b6e39b7a54f`; started the corrected launcher as `proc_2e1efe46c97f`, PID22364.
- GET `http://127.0.0.1:51206/api/capabilities` returned configured/native/`claude-opus-5`.
- Served `app.mjs` SHA256 matches the unchanged frozen application. `lsof` verified one loopback-only listener at127.0.0.1:51206, PID22364.
- Running launcher source SHA256: `67fe8367120d0502bbb92c4c85c3569d0e310f3f0393c2293214341ca15daeaa`.

## Scope and qualifications

No new model inference occurred. Credential resolution and native configuration are not proof of usable Opus generation. The latest429 diagnosis remains unresolved, and no OpenRouter inference/fallback was used.

The stdout cap is implemented using JavaScript string length:65,536 UTF-16 code units, not an exact64KiB byte cap for arbitrary Unicode. It is an output bound, but the worker's byte-precise wording was overstated. The20s timer and group cleanup were independently exercised with a shortened test timeout.

This accepts the bounded local-launcher repair and actual service restart, not a new full-app CTO/security certification. The server still uses the earlier frozen application, not the separate working-tree backend preflight corrections. Original RED and GREEN evidence remain intact. The replacement worker took315.74s against a4-minute target; it did not meet that target.

# UI contract addendum — verified against the RUNNING server

Companion to `UI_CONTRACT.md` (source-derived). Everything here was observed
against the live candidate on `http://127.0.0.1:51208/`, not read from source.
Where the two disagree, this file wins.

Owner of these facts: native-runtime lane (server/runtime/config/APIs).
Frontend lane owns `classroom/app/kaizen/`, `components/kaizen/`,
`lib/kaizen/client*` and new UI tests. No file is shared.

## Run it

```bash
# once: isolated Postgres (own compose project + own volume, loopback 51209)
cd /Users/man/education-product-discovery/classroom
OPENMAIC_DB_PORT=51209 docker compose -p kaizen-native-db -f docker-compose.db.yml up -d --wait postgres

# the server
cd /Users/man/education-product-discovery
node delivery/fullstack/native/launch.mjs --port 51208 --dev   # http://127.0.0.1:51208/
```

`--dev` runs `next dev`; omit it for a production build + `next start`. The
launcher refuses `--port 51206` (the owner's restored frozen preview).

Do NOT run `next build/start/dev` by hand: the launcher is what resolves the
credential and points `OPENMAIC_CONFIG` at the out-of-repo model config. Without
it the server either refuses to start or starts with no provider.

## RESOLVED: the contract's open question #1 — `config.agentIds`

`UI_CONTRACT.md` flagged this as "resolve before building chat". Answer:

**`resolveAgentConfigs` reads a client-side Zustand store
(`lib/chat/pi/config.ts:21`) which is EMPTY in the server process.** A
non-browser client that sends only `agentIds` gets
`400 "No valid classroom agents found"`. The frontend MUST send
`config.agentConfigs` containing a full config for every id in
`config.agentIds`.

Minimum working agent object (verified live):

```ts
{
  id: 'tutor',
  name: 'Tutor',
  role: 'teacher',                 // role drives upstream's action mapping
  persona: '<system prompt>',
  avatar: '/avatars/teacher.png',
  color: '#3b82f6',
  allowedActions: ['spotlight', 'laser', 'wb_open', 'wb_draw_text', 'wb_draw_shape'],
  priority: 10,
}
```

Working example: `delivery/fullstack/native/probe-chat.mjs`. Run it to see a
real answer and the real event sequence.

### Reuse upstream's tutor, don't write a new persona from scratch

`lib/orchestration/registry/store.ts:49-200` ships six complete agents. The
`default-1` teacher persona already says: explain step by step, use analogies
and visual aids, pause to check understanding, adapt pace, correct gently,
"Never announce your actions; just teach" — and it already carries the stage
tools. Its display names are Chinese (`AI助教`) and it needs translating, but
the teaching instructions are the asset. Start from it.

### Tool inventory actually reachable for the tutor

From `lib/orchestration/registry/types.ts:61-76`, enforced per-agent by
`allowedActions`:

| Group | Actions |
|---|---|
| Slide/stage | `spotlight`, `laser`, `play_video` |
| Whiteboard | `wb_open`, `wb_close`, `wb_draw_text`, `wb_draw_shape`, `wb_draw_chart`, `wb_draw_latex`, `wb_draw_table`, `wb_draw_line`, `wb_draw_code`, `wb_edit_code`, `wb_clear`, `wb_delete` |

These arrive as `action` and `whiteboard` SSE events for the client to apply.
Artifacts the owner named (podcasts, flashcards, study guides, worksheets) are
**not** in this inventory — they do not exist upstream as tutor tools and would
be new work. TTS/podcast is locked off in config regardless (see below).

## Verified SSE event sequence for `POST /api/chat/pi`

Framing is `data: <json>\n\n` (`app/api/chat/pi/route.ts:198`). Observed on a
real one-agent Q&A turn:

```
agent_start   x1      -> which agent is speaking
text_delta    x25     -> event.data.content, concatenate in order
agent_end     x1
cue_user      x1      -> tutor is handing the turn back to the learner
done          x1      -> carries data.directorState; resend it next turn
```

`action` / `whiteboard` / `thinking` / `error` exist but did not fire on this
turn. Treat `done` and `error` as the only terminal events. Cancellation:
abort the fetch — the route forwards `req.signal` to an `AbortController`
(`route.ts:191-193`).

Measured: HTTP 200, `content-type: text/event-stream`, first answer in ~10s
with no open lesson attached.

## Verified lesson generation

`POST /api/generate-classroom` -> `{ jobId, pollUrl, pollIntervalMs: 5000 }`,
then poll `GET /api/generate-classroom/{jobId}`. Observed step order:

```
queued -> generating_outlines -> "Generated N scene outlines"
       -> generating_scenes ("Generating scene i/N: <title>") -> completed
```

Request fields confirmed working: `requirement` (the learner's goal, free
text), `sceneCount`, `languageDirective` (free text, e.g. `"Write every scene
in English."`).

**`sceneCount` is a hint, not a cap.** A request for 3 produced **11** scene
outlines. Size the UI for a variable scene count.

## Catalogue and reopen

- `GET /api/stages` -> `{"stages":[...]}`. Verified empty (`[]`) on a fresh
  isolated database, so an empty catalogue is a real state the UI must render.
- Stages are **owner-scoped by the anonymous-identity cookie**. The client must
  send the same cookie jar on every call or it sees someone else's (empty)
  catalogue. Warm up with any request and reuse the `Set-Cookie`.
- `GET /api/stages/{id}` + `GET /api/stages/{id}/scenes` to reopen.

## Locale: a real gap the frontend must close

**The tutor answered an English-persona prompt in Chinese.** Upstream's
`defaultLocale` is `zh-CN` and `/api/chat/pi` reads no locale field at all —
`x-user-locale` is honoured by only two server sites, neither of them the chat
route. Spanish ships as `es-MX` (no `es`/`es-ES`).

Consequences for the frontend:

1. Generation: pass an explicit `languageDirective` on every call. It works.
2. Chat: there is no locale parameter. The ONLY lever is the agent `persona`
   you send, so state the language there (e.g. "Always reply in English." /
   "Responde siempre en español."). Do not expect the UI locale to reach it.
3. EN/ES is therefore a prompt-level contract, not a server setting. It needs
   its own test per language.

## Locked server-side — do not build UI for these

`/api/health` and `/api/generate-classroom/capabilities` both report:

```json
{"webSearch": false, "imageGeneration": false, "videoGeneration": false, "tts": false}
```

These are `null` in the model config (locked off, not merely unconfigured), so
the settings UI cannot turn them on. No voice/TTS, no image or video
generation, no web search. Per the owner's current sequencing that is correct:
voice must not gate the chat lesson proof.

`parallelSceneConcurrency: 4` is also visible on `/api/health`.

## Server-side policy the UI can rely on

- Every chat/generation stage resolves to `anthropic:claude-opus-5`. There is
  no fallback to any other model or vendor.
- A request naming its own `model`, `apiKey`, `baseUrl`, `providerType` or
  `x-model-routes` is **ignored** on a stage and **refused** without one. Do
  not build a model picker; it cannot work and does not need to.
- `accessCodeConfigured: false` on this candidate: no access-code header
  needed on localhost. Setting `ACCESS_CODE` would re-enable the gate.

# The turn engine

`POST /api/tutor/turn` is the only product route that streams. This file is the
contract between the engine (`lib/tutor/turn/`) and anything that consumes it —
the session screen, the voice controller in `lib/tutor/voice/`, and the evals.
Types live in `lib/tutor/contracts.ts` (`TurnRequest`, `TurnEvent`); this
document is the behaviour those types do not carry.

## Request

```jsonc
POST /api/tutor/turn
{
  "sessionId": "ses_…",     // must belong to the caller's account and learner
  "text": "I got 5/8",      // '' with inputMode 'voice' means silence
  "inputMode": "voice",     // 'voice' | 'text'
  "clientTurnId": "ct_…"    // client-minted; a retry with the same id replays
}
```

The learner, the account, and the age band come from the session cookie, never
from the body. A body field that contradicts the principal is ignored.

Refusals happen **before** the stream opens and are ordinary JSON failures:

| status | `errorCode`      | when                                      |
| ------ | ---------------- | ----------------------------------------- |
| 400    | `INVALID_REQUEST`| malformed body, or empty text in text mode |
| 401    | `UNAUTHENTICATED`| no session cookie                          |
| 403    | `NO_LEARNER`     | signed in, no learner selected             |
| 404    | `NOT_FOUND`      | unknown session, or another account's      |
| 409    | `SESSION_ENDED`  | the session is over                        |
| 429    | `RATE_LIMITED`   | per-minute bucket or the daily hop count   |

Anything that goes wrong after the headers are out arrives as an `error` frame
instead, because a status code is no longer available.

## Response frames

`content-type: text/event-stream`. Every frame is one

```
data: <TurnEvent JSON>\n\n
```

No event names, no ids, no comments — `lib/tutor/voice/sse-client.ts` reads it
with that assumption.

**Order.** `phase` is always the first frame and carries the minutes left.
`usage` and `done` are always the last two, in that order. Between them the
content frames appear in the order the model produced them:

```
phase → ( text_delta | sentence | action | check | reaction )* → usage → done
```

or `error` and stop, at any point. Within that middle section:

- a `sentence` frame follows the `text_delta` frames whose text completed it,
  so a consumer can render deltas and speak sentences from the same stream;
- an `action` frame is emitted the instant its `[[wb …]]` tag closes, which is
  what puts the drawing on the board within a couple of seconds of the words;
- at most one `check` and at most one `reaction` per turn.

| frame        | fields                                | notes                                             |
| ------------ | ------------------------------------- | ------------------------------------------------- |
| `phase`      | `phase`, `remainingMs`                | the phase for **this** turn                        |
| `text_delta` | `text`                                | speech only; tags are already stripped             |
| `sentence`   | `index`, `text`                       | 0-based, monotonic; the TTS unit                   |
| `action`     | `action`                              | a validated `WhiteboardAction`                     |
| `check`      | `check`                               | a `CheckPrompt` — **never the answer key**         |
| `reaction`   | `kind`                                | `smile` \| `not_quite` \| `neutral`                |
| `usage`      | `turnId`, `cents`, `sessionCents`     | integer cents, rounded up                          |
| `done`       | `turnId`, `phase`                     | the phase the session is in *after* this turn      |
| `error`      | `code`, `message`                     | `message` is safe to show a learner                |

`check_result` exists in the union but is never sent here: grading happens on
`POST /api/tutor/check`, and the result reaches the tutor through its next
turn's context.

### Error codes on the stream

| code            | meaning                                                | terminal |
| --------------- | ------------------------------------------------------ | -------- |
| `COST_CEILING`  | this session hit the per-session budget; it is now over | yes      |
| `DAILY_CAP`     | this learner hit the daily cap; the session is over     | yes      |
| `UPSTREAM_ERROR`| the provider failed mid-turn; the session continues     | no       |
| `INTERNAL_ERROR`| the engine failed after the headers went out            | no       |

Terminal codes are listed in `TERMINAL_ERROR_CODES`
(`lib/tutor/voice/turn-controller.ts`); the session screen must stop the loop
and offer a new session rather than retry.

## The tag grammar

Everything the model writes is spoken aloud **except** tags. A tag is
`[[name payload]]`, placed where the action belongs in the flow of speech. The
parser is incremental: a tag may be split across any number of stream chunks,
and a half-parsed tag is never emitted. `]]` inside a JSON string does not close
a tag. A tag that never closes (or over 4 000 characters) is dropped and
counted. The full authoring rules the model sees are in
`lib/tutor/prompts/whiteboard.md` and `checks.md`.

| tag                                | effect                                                           |
| ---------------------------------- | ---------------------------------------------------------------- |
| `[[wb {…}]]`                       | one whiteboard action → an `action` frame                         |
| `[[check {…}]]` / `[[check {"itemId":"F3-07"}]]` | a graded item → a `check` frame; the key stays server-side |
| `[[hint]]`                         | a hint, worked step, or part of the solution was just given       |
| `[[reaction smile]]`               | `smile`, `not_quite`, or `neutral` → a `reaction` frame           |

`[[hint]]` produces no frame. It writes a `hint` evidence row for the current
skill, and that row is what makes the learner's next check on that skill
**assisted** — which is the product's central rule: an assisted check can never
confirm mastery (strategy law 1, spec §5.7). Skipping the tag would let the
tutor grade its own help as the learner's knowledge.

## The whiteboard coordinate system

One sheet, **1000 wide × 562.5 high** (16:9), origin top-left, x to the right,
y downward. Every element is placed by its top-left corner. The prompt asks the
model to stay inside x 20–980 and y 20–540 and to stack downward
(`next y = previous y + previous height + 30`) or use the other column
(left 20–480, right 520–980).

Action types the tutor may use: `wb_open`, `wb_draw_text`, `wb_draw_latex`,
`wb_draw_shape`, `wb_draw_line`, `wb_draw_table`, `wb_clear`, `wb_delete`.
They are the whiteboard subset of the Action DSL
(`packages/@openmaic/dsl/src/action.ts`), so an existing renderer plays them
unchanged.

Validation (`actions.ts`), applied to every payload before it reaches a frame:

- an unknown type, a missing or non-numeric required field, an origin off the
  sheet, a zero-length line, a ragged table, or a `wb_delete` naming an element
  that is not on the board is **dropped** and counted in
  `SessionState.droppedActions`;
- a width or height that overruns the sheet edge is **clamped** to the edge
  rather than dropped, so a slightly oversized bar still teaches;
- `fontSize` is clamped to 10–72 and line `width` to 1–12; a colour that is not
  a hex, named, or `rgb()` value is dropped from the payload, not the action;
- every action gets an `id`, and every drawable an `elementId`, when the model
  omitted them — so a later `wb_delete` always has something to name.

The board is kept in `sessions.state.board`, so `GET /api/tutor/session?id=`
replays it after a reload.

## Phases

`greet → intake → diagnose → work ⇄ check → wrap → ended` (spec §5.2). The
engine decides the phase for the turn; the client only displays it.

- **greet** — the first turn. `text: ''` is expected; the tutor opens the
  session. The turn after a greeting is `intake`, or `diagnose` for a learner
  with no evidence yet.
- **intake** — restate the goal and get the actual problem in front of the
  tutor. Moves to `work`.
- **diagnose** — at most four placement items; each `check` answered on
  `/api/tutor/check` advances the binary search.
- **work** — the teaching loop. A check becomes due about every ten minutes or
  after a few turns, whichever comes first.
- **check** — set by the engine as soon as a `check` frame goes out; the check
  route moves it back to `work` (or `diagnose`) after grading.
- **wrap** — the band timer expired. The tutor recaps and says goodbye; one
  soft "keep going for five more minutes?" is offered if the plan has minutes.
  Answering yes extends the deadline and returns to `work`.
- **ended** — no further turns; the route answers 409.

`text: ''` with `inputMode: 'voice'` outside `greet` is **silence**: the tutor
sends one short check-in about the current step instead of re-explaining. It
does not count as a learner turn.

## Idempotency

The tutor's turn row stores its `client_turn_id` under a unique index per
session. A repeated `clientTurnId` therefore replays the stored answer as
`phase`, one `text_delta` with the whole text, and `done` — no model call, no
new usage line, no second charge. Retry freely on a dropped stream; that is
exactly what `streamTurn` in `lib/tutor/voice/sse-client.ts` does.

## Safety and ceilings

The learner's text is screened **before** the model is called
(`lib/tutor/safety/`):

- a crisis disclosure (self-harm, abuse) answers the referral text from
  `prompts/crisis.md` verbatim, files an `unsafe` flag for the account holder,
  and ends the session — no model call;
- a disallowed request answers a one-sentence redirect for the band and
  continues the session — no model call.

Both paths still emit the normal frame order, with `usage` at 0 cents.

Before every model call the engine checks the session budget
(`COST.hardCeilingCentsPerSession`, from the usage ledger's session total) and
the learner's daily cap (`TUTOR_DAILY_CAP_CENTS`, default four sessions' worth).
A breach emits `error` with `COST_CEILING` or `DAILY_CAP`, settles the minutes,
and ends the session.

## What is persisted

Per turn: a `turns` row for the learner (when they said anything) and one for
the tutor (text, `latency_ms` = milliseconds to the first delta, `model`,
`cost_cents`, `client_turn_id`); a `turn` evidence row with ids and counts; one
`hint` evidence row per `[[hint]]`; one `usage_ledger` line for the model hop;
and the updated `sessions.state` and `phase`.

Nothing written anywhere carries audio, a camera frame, or a name. Logs carry
ids and counts only.

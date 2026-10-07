# Chat-first sequencing and quality addendum

**ADDITIVE.** Authored 2026-10-03T23:18Z, specification lane. This document **adds** sequencing and
quality constraints. It **deletes, weakens and supersedes nothing** in
`delivery/fullstack/spec/ACCEPTANCE_MATRIX.md`, and it removes no full-product requirement from
`PRODUCT.md`, `DIRECTION.md` or `lesson/STATUS.md`. Every existing `FS-*` row keeps its current
status. No row is closed here.

Companion detail: `delivery/fullstack/teaching/TOOLKIT_AND_QUALITY.md` (toolkit inventory with status
and source paths, data boundaries, quality gates `QG-*`, test set `QT-01`–`QT-12`).

---

## 1. What changed, exactly

The owner reordered **implementation sequence**. Scope is unchanged.

| | Was | Now |
|---|---|---|
| First proven | isolated runtime + catalogue + course generation + maximum visuals together | **(1) actual generated lessons, each quality-checked** |
| Second | — | **(2) contextual text chat proving the tutor answers the actual latest question and adapts** |
| Third | — | **(3) useful diagrams and interactive demonstrations through the existing OpenMAIC stage** |
| Voice | in the same push | **after** the above core is proved — its own gate |
| Podcasts | requested toolkit item | **roadmap toolkit item**, not an immediate audio implementation and not an acceptance blocker |

**This is an implementation order, not a product reversal.** Visual-first intuitive teaching and the
long-term low-literacy reach goal remain the product. A chatbot-only product is still explicitly not
the product (`PRODUCT.md` Product Purpose). Text-as-backup remains the rule for the teaching
workload; chat-first means the *explanation and adaptation loop* is proved in the cheapest channel
first, with the stage carrying the teaching weight as soon as (3) lands.

## 2. Not blockers on the initial chat-first slice

These remain **open, required, and unmet** release gates. They are explicitly **not** blockers on
accepting the chat-first slice, and no progress on that slice weakens them:

- Real-user low-literacy validation and accessibility efficacy (`FS-D05`–`FS-D07`, `QG-R1`).
- Real-device spoken interaction (`QG-R2`) and all voice output/input quality.
- Educational efficacy (`QG-R3`).
- Durable multi-instance hosting, authenticated tenant boundaries, retention and consent.
- Group E (E1–E14) live-provider + durable-archive, still **UNEXECUTED**.

Deferred ≠ dropped. Each keeps its existing row and status.

## 3. Still blockers, now and in this slice

- `QG-S1`–`QG-S8` structural gates, and recorded `QG-E1`–`QG-E5` human evidence, before any lesson is
  **publicly published, badged ready or claimed as quality** (§4.5 of the companion doc). Invalid
  generation is **rejected**, never surfaced with a ready badge. **Correction:** this is *not* a
  mandatory human sign-off on every private AI-generated draft — that was a new unapproved requirement,
  not the owner's instruction. A private saved draft (`generated_complete`) may be saved and reopened
  without per-generation human approval; `markStageGenerationComplete` means generation finished, not
  human sign-off. Automated educational review on the private path is an **uncertain signal, not
  proof**. Truthful attempts/assistance/growth records are not quality claims and are not suppressed;
  **false mastery claims** stay prohibited.
- Nickname local-only; learner conversations and typed answers out of the shared catalogue.
- Camera OFF. No attention or affect signal collected, scored or inferred. Camera is recorded as
  **future direction only**; when designed it needs explicit signal, opt-in consent, retention
  boundary, a non-camera equivalent path, and validation — and attention is never evidence of
  learning.
- Native Opus locked server-side, no fallback provider or model. Fable suspended. OpenRouter
  TypeSafe-Jev-only, never generation. No DeepSeek.
- No mastery claim from completion, from a thumbs-up, or from a Tier-S/Tier-E pass.
- Honest capability language (**corrected 2026-10-03T23:30Z**): the earlier "uninstalled, unbooted
  candidate" wording is a **stale historical observation**. `classroom/node_modules` is present and a
  native runtime is booted on loopback `127.0.0.1:51206`; the `*:51208` instance was **stopped at
  23:21Z** after it was found bound to all interfaces with `accessCodeConfigured:false`
  (`../NATIVE_CORRECTION_DECISION_20261003T2321Z.md`). Installed and booted is **still not a live
  capability pass** — that decision records an unauthorized `course.content.effort: high` reasoning
  reduction and a chat probe with `stage_used: null` returning Chinese, so contextual EN/ES tutoring is
  unproven. "Upstream code exists and is wired to a route" remains **not** integration and **not**
  proof. No billing/subscription-429 root cause is claimed from `service_tier: standard`.

## 4. Capability caveats that the sequencing depends on

Each verified by reading `classroom/` at SHA `5312c2b4b4bc` on 2026-10-03T23:05–23:16Z. Full source
paths in the companion document.

1. **Latest-question prioritization exists on exactly one path.** `lib/chat/pi/prompts.ts:529-543`
   extracts the newest user message and foregrounds it as the director's prompt; the Pi path is the
   default (`lib/config/feature-flags.ts:99` defaults **on** when unset). The legacy `app/api/chat`
   path has none — `lib/orchestration/summarizers/conversation-summary.ts` defaults
   to `maxMessages = 10` (`:37`) / `maxContentLength = 200` (`:38`), sliced at `:44`, called with no
   override at `director-graph.ts:162`. **Chat-first evidence must come from the Pi path.**
2. **A diagram pipeline exists; its live quality is unverified** (corrected — the earlier "no
   conceptual-diagram renderer" wording wrongly implied missing capability). `scene-generator.ts:1240`
   routes `widgetType === 'diagram'` to `PROMPT_IDS.DIAGRAM_CONTENT`; the
   `packages/@openmaic/generation/templates/diagram-content/system.md` template explicitly generates
   **connected SVG nodes + edges + `revealOrder`** with edge-to-boundary maths, no-orphan-node rules and
   a **required widget `postMessage` listener** (`:80-82`); the shared
   `components/scene-renderers/InteractiveIframeHost.tsx` renders it. What is absent is a **dedicated
   React diagram component and any mermaid/d3 dependency**, and there is no separate `diagram` scene
   type (`SceneType` is `slide|quiz|interactive|pbl`) — diagrams ship **as** `interactive` scenes. That
   is not absence of diagram support, it does not call for a new diagram engine, and no test should be
   expected to fail merely because no dedicated component exists. Unverified: safety, factual accuracy
   and live on-screen behaviour. Alternative substrates stay available: echarts `ChartElement` and
   whiteboard `wb_draw_{shape,line,chart,text,latex,table}` ops. Priority (3) is specified against this
   existing pipeline.
3. **No dedicated generator was found for flashcards, worksheets, study guides or podcasts** (the
   narrow, accurate claim). **Corrections:** (a) the worksheet guardrail was overgeneralized —
   `tests/pbl/v2/planner-prompt.test.ts:47-51` only checks that the *PBL* single-call planner prompt
   hardens against **worksheet fragmentation** and **answer leakage**, and
   `prompts-pbl/planner-single-call-system.md:1-11` scopes itself to Project-Based Learning. It does
   **not** prohibit separate worksheet artifacts, so owner-requested worksheets can be built separately
   with **no permission decision and no reconciliation**; keep the guardrail and its tests unchanged.
   (b) `components/kaizen/ReadAloudNote.tsx` belongs to the **new Kaizen** surface, not upstream
   OpenMAIC — a temporary absence of Kaizen voice cannot be generalized into an upstream prohibition on
   podcasts. Voice/podcast remains a later gate by **sequencing**, not by prohibition.
4. **Retrieval is lexical-only and unwired.** `lib/rag/*` has no production importer (tests only); no
   embeddings or vector store anywhere. No retrieval-grounded teaching claim is available today.
5. **Human-curated source base, AI-selected.** Reliable human-authored sources are the base; the model
   selects and adapts with provenance, rights and quality recorded; **no bulk ingestion yet**. Existing
   ingest surfaces (`materials`, `extract-document`, `web-search`) are per-request and owner-scoped and
   must not be repurposed into a corpus pipeline without explicit authorization. Survey lane:
   `delivery/fullstack/research/oer-20261003/` (separate owner; not duplicated here).
6. **Quiz question types are `single | multiple | short_answer` only**, and `lib/quiz/grading.ts`
   resolves answer keys by exact/unique match with no case folding. An unresolvable key is an invalid
   lesson (`QG-S7`), not a rendering bug.
7. **Catalogue is `GET /api/stages`** (the generic owner document index) and the whole route family
   404s without `DATABASE_URL`. `TOPIC_SEEDS` in `lib/kaizen/client/course-request.ts` are 12 prompt
   seeds, not catalogue content.
8. **`app/api/generate-classroom` has no in-tree UI caller** and uses a *different* outline prompt
   (`requirements-to-outlines`) from the browser flow (`task-engine-outlines` /
   `interactive-outlines`). Picking the wrong entry point would silently change lesson shape.
9. **`components/scene-renderers/quiz-renderer.tsx` is an orphan** (zero importers); the live quiz is
   `quiz-view.tsx`. Do not build on the orphan.

## 5. In-flight files

`classroom/app/kaizen/**`, `classroom/components/kaizen/**`, `classroom/lib/kaizen/**` and
`delivery/fullstack/native/**` were being edited by two active worker lanes during this read.
`delivery/fullstack/native/UI_CONTRACT.md` is an **in-progress contract, not final proof**. Nothing in
this addendum freezes those files or asserts a pass over them.

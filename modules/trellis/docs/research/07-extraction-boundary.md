<!-- Synced from the Handler PM vault / shared artifacts on 2026-09-16. Source of truth for changes is the PM vault; edit there, then re-sync. Original: shared/artifacts/kaizen-research/07-extraction-boundary.md -->

# RO-6 — Kaizen extraction boundary

**Recommendation:** extract one household learning loop: parent account → age assurance and verified consent → learner placement → skill graph → text/voice tutoring with a five-primitive whiteboard → separately authorized delayed assessment → evidence-backed parent report. Keep the billing, deletion, safety, usage and job machinery that makes that loop operable. Use one new repository, one Next application, a private assessment service with separate database authority, and PostgreSQL. Carry no Kaizen-AI application runtime and no general-purpose model-provider registry.

**This research defines the boundary; it does not certify an already licensed, deployable build.** The existing board has unresolved PPTist provenance, the exact installed dependency notices are incomplete, and neither checkout has an executable Next installation. The extraction can proceed behind release gates. It cannot go to beta on the strength of the root MIT licence or a source LOC percentage. RO-5 repairs belong in the new repository.

## Evidence and scope

Research date: 2026-09-12, checked with `date`. Source aliases throughout:

| Alias | Read-only source | Pinned HEAD |
|---|---|---|
| E | `/Users/mann/pm/shared/repos/KaizenEdu` | `20a971b46c8c2bb7d19b9ccfdb8162637c1d1ffe` |
| A | `/Users/mann/pm/shared/repos/Kaizen-AI` | `91af9e452c7df5867afa7249a6dc58b00003f531` |

Read [RO-5](06-evidence-integrity.md), second opinion §K3 (`../astra-plan-20260912/kaizen-second-opinion.md`), and SPEC (`../../../vault/40-projects/kaizenai-saas/SPEC.md`) §§3.1, 4, 5 and 6. Latest amendments govern: under-13 from day one; independent delayed evidence; no invented staffed crisis-response promise; one $49 subscription, not the template's $29 or the withdrawn $119 tier. The legal operator is **Kaizen Academy LLC** and the domain is **kaizenedu.net**.

Evidence is source imports, package/lock metadata, local cached licence artifacts, primary upstream licence files, and a bounded executable probe. No provider credentials were used, no production services contacted, and no repositories modified. An attempted research delegation was unavailable; this is a single-worker report, not independent reviewer sign-off.

## 1. The retained boundary

“Retain” means copy a reviewed file subset and adapt the named seams. It never means copying a directory indiscriminately. The file list (`ro6-retained-files.txt`) enumerates the **339-file conditional application candidate**, including the board candidate; the import trace (`ro6-source-trace.json`) supplies individual import edges, line numbers, type-only edges, stopped seams, assets and hashes. The stop/filter rules in the tracer (`ro6-trace.cjs`) describe changes the builder still must implement.

| Retained function | Source modules and dependency closure | Required treatment |
|---|---|---|
| Learner and parent shell | E `app/(learner)`, `app/(parent)` selected pages/routes; `components/tutor` and reached UI utilities | New small root layout and tutor-only styles/config. Retain welcome, authentication, learn/session, parent account/report/billing/consent/data/settings/transcripts, support and legal pages. Omit eval and attention endpoints. |
| Account ownership | E `lib/tutor/auth`, `accounts`, reached entitlement/settings helpers; `pg`, Node crypto | Preserve opaque hashed sessions and household ownership. Add age/consent admission checks to every collecting endpoint. Parent/teen invitation routes must not bypass admission. |
| Teaching loop | E `lib/tutor/turn`, `prompts`, `graph`, `session`, `wire`, `wrap`, reached profile/content helpers | Preserve streaming controller, actions, context and persistence contracts. Replace provider calls, warm-up, generated claims and assessment writes. Copy the 18 prompt Markdown files explicitly; edit prompts that conflict with the latest SPEC. |
| Voice | E `lib/tutor/voice`, tutor ASR/TTS route contracts, local avatar/presence driver | Preserve recording, sentence splitting, playback queue, cancellation/barge-in and text fallback. VAD needs locally served worklet/model/ONNX assets. Extract selected ASR/TTS leaf transports behind the new provider interface; do not copy their registries. |
| Board semantics | E `lib/tutor/turn/actions.ts`, `components/tutor/board/{reducer,scene,board-pane}.tsx/ts`, viewport and minimal state | Preserve action validation, deterministic replay, replace/clear/highlight and viewport behavior. Required output primitives are **text, LaTeX, shape, line and table**, including strokes represented by existing actions. |
| Board presentation — conditional | Reached `components/slide-renderer` primitive renderers; `lib/utils/element.ts`; reached `packages/@openmaic/dsl/src` | Quarantine the 33-file board dependency group pending provenance resolution. Default escape hatch is a bounded presenter adapter over the retained action/replay contract, using React/SVG and KaTeX. No whole-editor or tutor rewrite. See §2. |
| Assessment and claims | E placement/check/item-bank/mastery/report interfaces; A evidence/trellis concepts and selected acceptance contracts | Keep practice useful but remove its authority to establish mastery. New private assessor owns qualifying evidence and the derived mastery projection. New content review/identity/provenance records are mandatory. |
| Parent operation | E report, email, support, flags, billing, usage/cost, deletion, export, settings and cron modules reached from routes | Deterministic claims, actual consent receipts, tenant isolation, durable outbox, idempotent Stripe processing, lawful deletion and measured usage. Remove camera/attention and third-party analytics dependencies. |
| Tests and content inputs | E `tests/tutor`, `tests/invariants`; A seven reference files listed below; E skill graph | Port relevant tests and change their assertions to current SPEC. Old preview, staff/admin, attention and timed-human-paging expectations are review inputs, not requirements to preserve. Unreviewed item bank is a quarantined fixture, never production mastery content. |

The exact runtime asset list is `runtimeAssets` in the trace: `lib/tutor/graph/skill-graph.json` plus 18 prompt files. The current 118 authored check items have **zero reviewed items** according to the preceding research/spec context; copying their JSON does not qualify them. Algebra-readiness scope remains conditional on the content/placement decisions already recorded. Do not manufacture a new curricular scope during extraction.

### Seams that make this a real extraction

1. **Root layout:** E `app/layout.tsx` statically imports upstream providers, storage/access machinery and fonts. Conditional hiding does not remove those imports. Create a tutor root; do not import the old root or whole `kaizen.config.ts`.
2. **Board context/store:** `board-pane` reaches `WhiteboardCanvas`, `SceneProvider`, `lib/store/canvas.ts`, stage/storage and rich-text editor state. `SceneProvider` subscribes to the stage store even when passed a controller. Supply a tutor-scoped context/store containing only the reducer's state; sever editor/ProseMirror and global stage subscriptions.
3. **Renderer:** `ScreenElement` statically imports image/chart/video/code as well as the five required primitives. Physically remove unsupported renderers and their imports. Do not keep them merely because a prompt says not to emit them.
4. **Localization/UI:** replace `use-i18n`'s global catalog dependency with the retained tutor labels. E `components/ui/button.tsx` and `tabs.tsx` import aggregate `radix-ui`; promote only `@radix-ui/react-slot` and `@radix-ui/react-tabs`. This avoids pulling the aggregate UI family into the lock closure.
5. **Provider, configuration and telemetry:** replace `turn/llm-call.ts`, **`turn/warm.ts`**, general audio registries, provider-config, runtime-config generator, pricing/config-status, and analytics client/server imports. Warm-up is an independent path back to the old provider registry.

Unmodified learner/parent imports reach 539 files and 101,967 physical code lines. The board entry alone reaches 229 files and 57,862 lines. This is why “copy `lib/tutor`” or “take the learner route group” is not a dependency boundary.

## 2. Licences and notices: permission is conditional on provenance

### Repository code

| Retained source / licence file | Exact short quotation | Consequence |
|---|---|---|
| E `LICENSE` | “Copyright (c) 2026 THU-MAIC”; “use, copy, modify, merge, publish, distribute, sublicense, and/or sell” | MIT permits commercial modification and distribution. Preserve the **complete** original copyright, permission and disclaimer text with substantial copied portions. Extraction does not erase THU-MAIC/OpenMAIC attribution. |
| E `LICENSE` notice condition | “The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.” | Include upstream licence in the source distribution and shipped third-party notices; retain applicable source headers. Company branding is separate from attribution. |
| E `packages/@openmaic/dsl/LICENSE`, `packages/@openmaic/renderer/LICENSE` | “MIT License”; “Copyright (c) 2026 THU-MAIC” | Preserve each applicable package notice if that package/source survives. These declarations do not answer third-party provenance questions inside copied code. |
| A `LICENSE` | “Copyright (c) 2026 Kaizen Academy LLC. All rights reserved.”; “No license, express or implied, is granted” | Proprietary company material, not open source. Internal adaptation for the same operator does not justify publishing A under MIT. Preserve the company's ownership and confirm authority for any later external distribution. |
| A `web/THIRD_PARTY_NOTICES.md` | “Third-Party Notices — Kaizen (web)” | Useful inventory lead for A's installation, not a transferable notice bundle for E's different versions or the new deployment. Rebuild the inventory from the actual extracted lock and artifacts. |

The new repository may identify Kaizen Academy LLC as owner of its own additions while preserving upstream grants and ownership. Do not replace E's notice with an all-rights-reserved notice that purports to cover upstream MIT code exclusively.

### Board provenance blocks unconditional reuse

E `components/slide-renderer/components/element/TableElement/StaticTable.tsx:13` says it was **“ported from PPTist StaticTable.vue.”** The same attribution is present in E's initial OpenMAIC commit `0d20abf`; that commit did not contain a root `LICENSE`. A search of tracked licence/notice files did not establish the source revision or a PPTist-specific grant for the port.

PPTist's current primary licence is AGPL-3.0. Its README identifies historical Apache-2.0 revision `f1a35bb8e045124e37dcafd6acbf40b4531b69aa`; that revision's licence bears “Copyright (c) 2021 pipipi-pikachu.” Neither the existence of that older grant nor OpenMAIC's acknowledgement proves that E's port came from it. [Current licence](https://raw.githubusercontent.com/pipipi-pikachu/PPTist/master/LICENSE), [upstream licensing explanation](https://raw.githubusercontent.com/pipipi-pikachu/PPTist/master/README.md), [historical Apache licence](https://raw.githubusercontent.com/pipipi-pikachu/PPTist/f1a35bb8e045124e37dcafd6acbf40b4531b69aa/LICENSE).

**Disposition:** no unconditional copying of the 33-file board dependency group into the releasable slice. First establish applicable ancestry/rights and collect the corresponding notice/source obligations. If that cannot be established, retain the tutor's action/replay behavior and replace only the presenter/type adapter, without copying the quarantined implementation. The quarantine is a practical dependency group, **not a claim that all 33 files are AGPL or infringing**. A permissible historical port would still require the applicable Apache licence, attribution and modification notices. A decision to comply with AGPL for a combined application would be a separate product/licensing decision; this report does not silently choose it.

There is also a behavior reason to isolate this presenter: original action validation and the board reducer accept/preserve raw markup, and the text/table renderer uses `dangerouslySetInnerHTML`. The executed probe (`ro6-build-probe.json`) preserved a harmless markup fixture through validation, text construction and table formatting. No browser exploit was attempted. The new boundary renders ordinary text as text and only trusted KaTeX-generated markup with `trust: false`; it rejects arbitrary HTML, media and executable/URL-bearing actions.

### Exact package dependency inventory

[The licence annex](ro6-license-inventory.md) quotes the exact-version declaration for **every identified package version**, with the evidence file and artifact-notice status; JSON (`ro6-license-inventory.json`) retains supporting evidence and different-version leads separately. `UNVERIFIED at locked version` means unresolved, not permissive. This annex is part of this report.

The conditional packaging baseline has **24 direct runtime roots**, **181 peer-qualified/optional lock snapshots**, and no missing referenced lock nodes. Its build/test baseline has **13 direct roots**, **299 snapshots / 298 unique package versions**. Their union is **446 unique package versions**. “Runtime” here means reachable in the inherited runtime lock snapshot, including optional platform packages and peer resolutions; it is not proof all 181 ship in a production bundle. For example, Next's inherited peer resolution pulls testing/build packages into that classification.

Runtime roots at the E lock's resolved versions:

| Function | Direct packages |
|---|---|
| Framework | `next@16.2.11`, `react@19.2.3`, `react-dom@19.2.3` |
| State/UI | `zustand@5.0.11`, `immer@11.1.4`, `@radix-ui/react-slot@1.2.3`, `@radix-ui/react-tabs@1.1.13`, `class-variance-authority@0.7.1`, `clsx@2.1.1`, `tailwind-merge@3.5.0`, `sonner@2.0.7`, `motion@12.35.2`, `lucide-react@0.562.0` |
| Board/math | `katex@0.16.38`, conditional `tinycolor2@1.6.0` |
| Voice | `@ricky0123/vad-web@0.0.30`, `onnxruntime-web@1.29.0` |
| Server | `pg@8.22.0`, `stripe@22.6.1`, `zod@4.3.6`, `nanoid@5.1.16`, `heic-convert@2.1.0` |
| Provider packaging example only | `ai@6.0.168`, `@ai-sdk/openai@3.0.84` — adapter substitution changes this part of the closure; this is **not** vendor approval or a required vendor |

Build/test roots: TypeScript 5.9.3, Tailwind and its PostCSS plugin 4.2.1, PostCSS 8.5.15, Vitest 4.1.8, Playwright 1.58.2, PGlite 0.3.16, and the six `@types` packages for node/react/react-dom/pg/katex/tinycolor2. Exact roots and all recursively resolved dependency/optional-dependency edges are in build lock (`ro6-build-lock.json`) and `lock` in source trace (`ro6-source-trace.json`). Peer versions remain qualified; platform optionals are not discarded by guesswork. The new minimal manifest must re-resolve this deliberately, rather than retaining unrelated lock importers.

Material notices beyond the repository MIT declaration:

| Component | Quoted declaration and primary file | Required handling |
|---|---|---|
| VAD wrapper and model | Wrapper “ISC”; model “Copyright (c) 2020-present Silero Team” under MIT, in [release-linked LICENSE](https://raw.githubusercontent.com/ricky0123/vad/3fec174/LICENSE) | Preserve **both** texts with the worklet/model distribution. Existing blanket MIT credits are insufficient for the ISC wrapper. |
| ONNX web/common 1.29.0 | “MIT” in pinned package manifests; [LICENSE](https://raw.githubusercontent.com/microsoft/onnxruntime/v1.29.0/LICENSE) | Include Microsoft notice and inspect distributed WASM/third-party notices, not only the JavaScript manifest. |
| Lucide 0.562.0 | “ISC License” and “MIT License” in [LICENSE](https://raw.githubusercontent.com/lucide-icons/lucide/0.562.0/LICENSE) | Preserve Lucide and Feather-derived copyright blocks. |
| KaTeX 0.16.38 | “The MIT License (MIT)” in [LICENSE](https://raw.githubusercontent.com/KaTeX/KaTeX/v0.16.38/LICENSE) | Preserve the notice; inspect the exact font distribution and any separate bundled notices before self-hosting fonts. |
| HEIC conversion | `heic-convert@2.1.0` and `heic-decode@2.1.0`: “ISC” in their primary manifests; `libheif-js@1.19.8`: “LGPL-3.0” in [package.json](https://raw.githubusercontent.com/catdad-experiments/libheif-js/1.19.8/package.json) | Server-side upload support reaches LGPL code. Keep library separable and satisfy the applicable notice/source/relinking obligations for any distribution; “server-only” is not a blanket exemption. [Licence](https://raw.githubusercontent.com/catdad-experiments/libheif-js/1.19.8/LICENSE). |
| Sharp/native image dependencies reached through Next | Exact `@img/sharp-*` declarations include “Apache-2.0 AND LGPL-3.0-or-later”; files and versions quoted individually in the annex | Inspect the actual Linux/native artifact, bundled libvips notices and source obligations. Do not call the deployment MIT-only. |
| Remaining transitive packages | MIT, ISC, Apache-2.0, BSD and other declarations, or explicit unresolved entries, individually quoted in the annex | Preserve all applicable copyright/licence/NOTICE files, Apache modification notices, and any distribution obligations. A package name or SPDX identifier alone is not the complete required notice. |

Prepare `THIRD_PARTY_NOTICES.md`, an exact lock/SBOM, licence text directory and browser-visible credits linked from `/legal/credits`. Include assets, fonts, WASM and native bundles. Re-run against the final adapter choice and actual Linux build; reject unresolved licences in shipped artifacts. The annex currently verifies declarations for only part of the union; declaration evidence and possession of the actual notice files are separately counted in licence summary (`ro6-license-summary.json`). **No claim of full licence closure is made.**

At this research snapshot, **243/446** versions have exact-version licence declarations established, including **129/181** runtime-classified versions; actual cached artifact notice files were found for **132/446**, including **55/181** runtime-classified versions. The remaining **203 declarations** are unresolved. These are different measures, not additive totals. Official source licences supplement the cache evidence but do not certify every file in an npm/native artifact.

## 3. Provider boundary: Gemini cannot cross it

E `kaizen.config.ts:235–249` and the general provider registry are incompatible with the accepted under-18 constraint. The public Gemini terms prohibit API use in an application directed toward or likely accessed by under-18s; this is an application restriction, not something a different prompt fixes. [Google's terms](https://ai.google.dev/gemini-api/terms).

**Exclude physically:** `lib/ai/providers.ts` and its general resolution chain, `@ai-sdk/google`, Google/Vertex endpoints/configuration, Gemini model identifiers/defaults, client model selection and the inherited `lib/audio/*-providers.ts` registries. Do not copy old `.env` defaults or `runtime-config.generated`. A source denylist alone is insufficient: gateways and “OpenAI-compatible” proxies can route to an excluded backend.

Create a server-only interface for `streamTutor`, `diagnose`, `extractProblem`, `gradePractice`, `wrap`, `safety`, `transcribe` and `synthesize`. Every configured route supplies an explicit adapter, backend/model identity, age eligibility, terms/policy revision, allowed data classes, retention/training setting and a measured pricing record. Missing/unknown policy, provider or pricing fails closed. No implicit `DEFAULT_MODEL`, environment fallback, arbitrary base URL, client credential override or automatic gateway substitution. `turn/warm.ts` uses this same interface.

The illustrative `ai` dependency itself brings `@ai-sdk/gateway` transitively. If retained, pass only explicit qualified model objects; never a bare model string that invokes implicit gateway resolution. Prove allowed egress in tests, and reject Google/Vertex and unresolved gateway destinations at deployment configuration and network boundaries. If the selected adapter does not need `ai`, drop that dependency closure. Existing speech leaf transports use native fetch, so copying a complete SDK family for ASR/TTS is unnecessary.

Provider choice remains an unresolved launch gate, not a reason to hardcode a vendor now. Re-run privacy/age/terms and cost checks for the chosen routes before enabling child data. Assessment uses reviewed deterministic answer/rubric logic where supported and abstains on unsupported evaluation; a model's “correct” string cannot write qualifying evidence. Parent report claims come from structured evidence, not a reporting model.

## 4. COPPA admission and retained route surface

### The architectural home for age assurance and consent

E `lib/tutor/accounts/learners.ts` currently creates an under-13 learner with name and birth year before consent. E's consent record requires an existing learner, and `consents.ts` accepts a requested method/evidence reference rather than implementing verifiable parental consent. The account/principal logic also has paths where a locked or under-13 learner is admitted by status/gate logic without a verified consent receipt. Birth-year classification is not sufficient age assurance.

Create a **parent onboarding intent before any child profile**. A minimal assurance step establishes an age band; a signed server-side result controls admission. Unknown, pending, denied, expired or revoked states cannot create a learner or collect child text, voice, images, session history or analytics. Under-13 admission requires a verified guardian/consent receipt tied to the operator, purpose, policy version, collection/disclosure scopes, verification method, timestamps and revocation state. Do not use an initial named “locked learner” as the waiting room.

The assurance/VPC process itself needs a purpose-limited design: no child name/DOB in the preflight by default, no retained identity documents in the application, minimum necessary parent verification data, limited retention and a processor agreement appropriate to the chosen method. Unavoidable transport metadata also needs minimization. This is not a claim that an age checkbox or card transaction alone completes compliance. COPPA requires verifiable consent before covered collection/use/disclosure and a method reasonably calculated to establish the parent. [16 CFR §312.5](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-312/section-312.5).

Parent identity, child admission and processor permission are distinct controls. Enforce them **at every collection point**, including sign-up/invitations, coursework, ASR, extraction, support/error reports and background tasks. Remove PostHog client/server transports entirely from the minimum slice; retain necessary first-party operational events without child free text. Consent revocation cancels pending collection/provider jobs, ends sessions and prevents queued email/report jobs from acting on a stale admission snapshot. Separate service-essential processing from optional disclosures/marketing choices.

### Pages and handlers

Keep `/learn`, `/session/[id]`, parent pages and the relevant authentication flows. Make `/` the new welcome page. Rewrite `/legal/terms`, `/legal/privacy`, `/legal/ai`, `/legal/credits`, support and email identity for **Kaizen Academy LLC / kaizenedu.net**. Remove old promises, upstream demo text and unsupported tracks. Every parent page's backend still checks ownership; a hidden navigation item is not authorization.

The candidate retains these **34 existing route files** as adapted contracts. Route manifest (`ro6-routes.json`) records original source paths and detected methods; the `/api` URLs below omit Next route-group names.

| URLs (common prefix) | Existing methods | Extracted responsibility |
|---|---|---|
| `/api/tutor/auth/learner`, `/sign-in`, `/sign-out`, `/sign-up`, `/teen-invite`, `/teen-sign-in` | POST | Auth/admission; no child data before applicable admission. |
| `/api/tutor/auth/me` | GET | Minimal current principal, not another household's data. |
| `/api/tutor/auth/parent-invite`, `/parent-invite/accept` | GET; POST respectively | Parent-linked invitation validation/acceptance. |
| `/api/tutor/auth/password-reset/request`, `/password-reset` | POST | Hashed expiring single-use tokens, enumeration-resistant responses. |
| `/api/tutor/session` | POST, GET, PATCH | Authorized session lifecycle, server clocks and durable identities. |
| `/api/tutor/turn`, `/asr`, `/tts`, `/problem-extract`, `/wrap` | POST | Teaching/media interfaces through qualified providers; no qualifying evidence write. |
| `/api/tutor/check` | POST | Practice result only after assessment split. |
| `/api/tutor/coursework` | GET, POST, PATCH, DELETE | Owned uploads and work; type/size limits, safe decoding, purpose/retention. |
| `/api/tutor/progress` | GET | Read server-derived evidence projection. |
| `/api/tutor/flag`, `/support`, `/error-report` | POST | Minimal safety/support/operational capture; rate limits and redaction. |
| `/api/tutor/health` | GET | Readiness without secrets or child data. |
| `/api/tutor/cron/weekly-email` | GET | Authenticated scheduler entry; enqueue durable, idempotent deliveries. |
| `/api/tutor/email/unsubscribe` | GET, POST | Signed, purpose-scoped unsubscribe action. |
| `/api/parent/billing` | GET, POST | Parent entitlement/checkout, current single-plan price. |
| `/api/parent/billing/webhook` | POST | Signature verification, deduplication and transactional subscription update. |
| `/api/parent/consent` | GET, POST, DELETE | Consent receipt/status/revocation; POST no longer asserts verification from client input. |
| `/api/parent/data` | GET, POST | Owned export/deletion request; execution belongs to restricted jobs. |
| `/api/parent/learners` | GET, POST, PATCH, DELETE | Profiles only after admission; enforce ownership and revocation. |
| `/api/parent/report`, `/transcripts` | GET | Evidence-backed household view, disclosure/retention controls. |
| `/api/parent/settings` | GET, PATCH | Parent preferences and allowed disclosures. |

Slash-shortened names within each row inherit that row's stated common prefix, not `/api` alone. The full machine-readable manifest removes ambiguity.

**New contracts, names proposed:** `/api/onboarding/age`, `/api/onboarding/consent`, a signed verification callback; `/api/tutor/assessment/issue` and `/submit` as admitted learner proxies to the private assessor; `/api/tutor/vad/[asset]` serving an exact asset allowlist; private durable job execution for assessment windows, weekly reports, deletion and outbox delivery. Public requests cannot choose an arbitrary asset path, assessment timestamp/key or internal job action.

No classroom, generation, marketplace, scheduling, admin or legacy API handler is copied. Assert their absence from Next's built route manifest and return 404 for representative paths. Necessary scheduler/assessor endpoints use dedicated service authorization; that does not justify retaining an admin UI.

## 5. Database and authority changes

E `lib/tutor/db/client.ts` is the persistence base, with PostgreSQL rather than A's separate Supabase application/auth stack. It currently runs schema DDL during initialization. Move DDL into versioned migrations executed by a separate migration identity; application startup performs readiness checks, not `CREATE/ALTER`.

| Existing E table group | Treatment |
|---|---|
| `accounts`, `learners`, `account_sessions`, `auth_tokens`, `consents`, `parent_settings` | Retain with pre-profile onboarding and signed assurance/VPC records, session revocation and household keys. Existing consent state is not automatically accepted as verified. |
| `coursework`, `sessions`, `turns`, `learner_profiles`, `skills`, `misconceptions` | Retain appropriate teaching state, bounded retention and account/learner ownership; identify same-skill instructional exposure across sessions. |
| `check_items`, `evidence_events`, `skill_mastery` | Adapt heavily: reviewed item versions, independent assessment events, server-only claims. Old mastery values are untrusted historical claims, not migrated mastery. |
| `usage_ledger`, `subscriptions`, `stripe_events` | Retain with reservation/finalization and webhook idempotency; update actual route prices and entitlement contract. |
| `flags`, `deletion_requests`, `app_settings`, `support_requests`, `email_log` | Retain minimal operational duties, with bounded access, redaction, durable work and delivery records. |
| `attention_stats`, `recovery_events` | Omit camera/attention and associated recovery telemetry from the minimum slice; remove dependent report/export/deletion queries in the same change. Any later non-camera recovery metric needs its own stated purpose. |

Add or explicitly model:

- **Admission:** onboarding intent, age-assurance receipt, guardian verification and consent scope/version/revocation, preceding learner creation.
- **Reviewed content:** item ID/version, skill, family, context, answer key/rubric, review state, reviewer and source licence. Keep assessment keys outside tutor-readable content views.
- **Exposure:** durable learner+skill instructional exposure sequence with server time, including hints, untagged tutor teaching and cross-session actions. Different skills do not reset each other's quiet window.
- **Assessment:** issued attempt identity, mode, item/family/context, server-issued/received timestamps, exposure snapshot and permanent assisted latch. One atomic finalization writes response, evaluation, qualifying/nonqualifying evidence and projection update, with unique retry identities.
- **Claims:** evidence class, evaluator/rule version and supporting evidence IDs. Keep corrections/supersession auditable rather than mutating old successful claims invisibly.
- **Scheduling and delivery:** quiet-window eligibility/offers, approximately day-7 second check, 14-day no-window parent notification, transactional outbox/job attempts and usage reservations. No request-local timer is the durable scheduler.

### Restricted assessor is a process/credential boundary

The smallest acceptable topology is one repository with two separately configured executions: the Next application and private assessor. The assessor alone holds the database authority to finalize qualifying evidence and update mastery projections. The tutor role writes teaching/practice records and reads permitted projections; the reporting role/view reads them. Jobs and migrations have separate restricted identities. **Putting an assessor password in the same general Next environment does not establish this restriction.**

Use PostgreSQL privileges plus account-scoped keys/RLS where appropriate. Test with the actual runtime identities: tutor/report cannot write qualifying evidence, read protected answer keys, bypass tenant ownership, assume the assessor role or disable triggers. Revoke unintended `PUBLIC` function execution; any security-definer function needs a fixed safe search path and tightly scoped execution grants. Composite ownership constraints should prevent references across accounts, not depend solely on request filters.

E's existing schema is not proof of RLS isolation. E `lib/tutor/accounts/deletion.ts:150` disables the immutable evidence trigger during deletion; the ordinary app must lose that DDL power. A restricted, audited deletion job handles applicable retention/deletion obligations without exposing “disable evidence protections” to the tutor. Revocation/deletion must also cover queued work, exports, backups and restore procedures.

### What comes from A

Use A `supabase/migrations/0012_kc_library.sql`, `0013_evidence_ledger.sql`, `0030_mastery_law_hardening.sql`, `0034_trellis_foundations.sql` as **design/reference inputs**, plus `web/test/{claims,priceTruth,masteryRecord}.test.mjs` as acceptance-contract inputs. Their exact list/count is in A footprint (`ro6-a-reference-footprint.json`).

Do not run those four migrations verbatim: they refer to Supabase `auth.users`, roles such as `anon`/`authenticated`, `is_admin`, tutoring/club tables, and `item_attempt` from another migration. Copying their dependency chain imports the application being excluded. Adapt the evidence/trellis constraints into E's new PostgreSQL migrations, map existing skill IDs explicitly to concepts, and reproduce the claims tests against the new roles/schema. **Zero A runtime source files are imported by the proposed application graph.**

## 6. Credentials and deliberate exclusions

**Committed-credential finding:** E's tracked `.env.local` contains non-placeholder values in six credential fields: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, `TTS_OPENAI_API_KEY`, `TTS_ELEVENLABS_API_KEY`, `ASR_OPENAI_API_KEY`. Values were neither copied into artifacts nor used. Validity and rotation were not tested. KaizenEdu#56 is the already-recorded unrotated-key issue supplied by the dispatch; this report does not claim that rotation has happened. Redacted findings (`ro6-credential-findings.json`) contain field names and classification only.

E `.env` contains configuration rather than established secret values in this scan, but must still be excluded: it carries defaults and the old build explicitly traces it. A's inspected example files contain placeholders/development defaults; no real A provider key was established by this scan. This was not a full historical secret audit.

| New credential/config surface | Placement and rule |
|---|---|
| App, assessor, jobs and migration database URLs | Four separate credentials/deployment scopes; E's single `DATABASE_URL` must not retain all powers. |
| Qualified text/vision/speech provider credentials | Server-only adapter configuration, never browser settings or `NEXT_PUBLIC_*`; fresh provisioned keys and explicit endpoint allowlist. |
| Assessor service authentication | Short-lived or otherwise scoped service authentication; never exposes database writer credential to the Next app. |
| VPC/assurance integration and signing/webhook secrets | Restricted onboarding service configuration; signature/replay protection and minimal retained verification records. |
| Stripe secret, webhook secret and price ID | Preserve server-only checkout/webhook separation; verify current product/price, signature and event idempotency. |
| Resend/email credential and verified sender | Server-only; sender identity belongs to Kaizen Academy LLC on kaizenedu.net. Domain/sender verification must be executed before launch. |
| Scheduler secret (`CRON_SECRET` or equivalent), `APP_URL` | Dedicated scheduler auth; `APP_URL=https://kaizenedu.net`. No secret-bearing URLs in client config/logs. |
| User sessions/reset/invitation tokens | Preserve opaque, hashed, expiring/single-use semantics; TLS, Secure/HttpOnly/SameSite and CSRF/Origin behavior verified. No additional JWT signing key is needed solely to retain the existing opaque-session design. |

Create a fresh repository from a file whitelist, with a value-free `.env.example`. Do not copy `.git`, git history, `.env*`, generated runtime configuration or old build outputs. Rotation of exposed keys is a prerequisite for live integration, not a side effect of extraction. No credentials were rotated during read-only research.

Explicitly leave behind:

| Exclusion | Why |
|---|---|
| A club storefront, scheduling, tutor marketplace and their migrations/auth application | Different product/business workflow; carries a second auth/schema/dependency universe. |
| Certified, Gov and Kids tracks | Not the approved household learning slice; avoid unbuilt product/compliance promises. **Excluding the Kids product track does not exclude under-13 learners.** |
| E classroom/workspace/workbench, generation preview, eval, classroom/admin routes | Upstream creation/demo/editor functionality; not required for the household loop. |
| OpenMAIC agent runtime, importer/exporter/PPT/PDF/render-service and unrelated workspace packages | Large build/runtime closure irrelevant to this loop. Conditional board types are the only proposed OpenMAIC package exception, subject to §2. |
| General provider/audio registries and Gemini/Google/Vertex defaults/routes | Violates the under-18 constraint and prevents explicit provider qualification. |
| Upstream demo assets, bulk `public`, remote avatars/Rive rigs, demo courses and unrelated subject content | No essential role in the slice; asset rights/egress/bundle cost not justified. Keep local minimal presence behavior and deliberately licensed math/voice assets only. |
| PostHog, camera/attention signals, unreviewed/generated mastery evidence | Not necessary to operate the loop; creates collection or evidence-authority defects. |
| A legacy application and E old legal/pricing/brand claims | Stale operator/product promises and a second application are not reusable infrastructure. |

## 7. Extraction packages, behavior evidence and rollback

Build only in the new repository. Each package gets a builder and an independently briefed reviewer reading SPEC, acceptance criteria and the diff, with reproduced evidence. These are future work packages, not tasks performed by this research worker. Do not deploy intermediate packages to children.

| Order | Concrete change | Evidence required before advancing |
|---|---|---|
| 1 — provenance and boundary | Create clean repository from the whitelist; retain upstream notices; resolve or replace the quarantined board; write minimal manifest, explicit provider interface and new root layout/config. Exclude old routes, assets, secrets and build scripts. | Source provenance/notice ledger, final lock dependency graph, secret scan including generated output, denied-import checks, reviewer sign-off on board disposition. No unresolved shipped licence. |
| 2 — runnable teaching shell | Preserve welcome/auth, learner/session, tutor streaming, text/voice/board and parent skeleton against synthetic data and a fake qualified provider. Implement local VAD assets and explicit prompt/content tracing. | Clean supported-runtime install/build/start; route/asset manifest; browser replay/screenshots; typed action equivalence; mic-denied text fallback; cancellation and reconnect tests. This establishes an executable extraction before adding live credentials. |
| 3 — admission and persistence | New migrations and database roles, pre-profile age/consent onboarding, ownership, restricted jobs/deletion, minimal telemetry and key provisioning boundaries. | Actual PostgreSQL migration/role/RLS tests, fresh-database and upgrade tests, deny-before-collection HTTP/network/DB probes, revocation races and clean restore rehearsal. |
| 4 — independent evidence | Port RO-5 reproductions as red tests; split practice/assessment authority; introduce reviewed content, exposures, permanent help latch, atomic idempotent finalization and versioned claims. | All seven defect classes below fail safely; controls still work; PostgreSQL concurrent request/fault-injection reproduction; parent views derive exactly from qualifying events. No SQLite result substitutes for deployed DB enforcement. |
| 5 — paid household operation | Wire qualified providers, measured costs/entitlements, Stripe, parent reports, weekly outbox delivery, support/safety disclosures and data export/deletion. Replace legal/pricing identity and verify sender/domain configuration. | Synthetic full-household journey, Stripe test-mode duplicate/reordered event tests, measured provider egress/cost/latency, job retry/revocation tests, lawful data lifecycle proof and realistic operational wording. |
| 6 — controlled release | Build exact production artifact, close installed licences/notices, run independent end-to-end review, restore test and rollback drill. Only then enable the consented beta cohort on kaizenedu.net. | CI green, build/route/dependency manifests and artifact digest, browser evidence, security/DB assertions, reviewer reproduction, remaining content/provider/consent gates explicitly closed. |

### The build contract is smaller than the old install

E `package.json` postinstall builds `mathml2omml`, `pptxgenjs` and the OpenMAIC generation/storage/importer/renderer/editor family, then synchronizes the importer. Its build first asserts a vendor importer and generates runtime config. None of that belongs in the extracted install. Give the extraction its own small scripts and configuration; do not install E wholesale and hope tree-shaking repairs the build system.

E `next.config.ts:5` traces the agent runtime/importer and **`.env`**. Remove these includes. Explicitly include the retained file-read prompt/content assets and only the selected voice assets. Next tracing discovers imports, require and filesystem use, but static public assets still need packaging; capture the actual `.nft.json` and deployment route/output manifests. A standalone self-hosted build needs its chosen `public` and `.next/static` content copied into the deploy artifact. [Next output/tracing documentation](https://nextjs.org/docs/app/api-reference/config/next-config-js/output).

E `lib/tutor/voice/vad.ts` expects `/api/tutor/vad/...`; **no such tracked route exists at this HEAD**. Package the version-matched VAD worklet, Silero model, ONNX module/WASM files and licences, and prove they load from the same origin with no CDN fallback. Avoid a catch-all file server. Voice success requires permission handling, audio lifecycle and browser validation, not just a successful ASR HTTP response.

For Vercel, retain the Next application deployment plus a separately credentialed assessor execution. Set explicit route-level duration configuration for streaming/media work and test actual streaming/cancellation on the chosen deployment; do not assume a generic old file glob matches route-group source paths. The current source explicitly sets ASR/TTS durations but does not establish the entire turn's production budget. [Vercel function-duration configuration](https://vercel.com/docs/functions/configuring-functions/duration). A PostgreSQL durable outbox decouples periodic work from a single request's lifetime; the scheduler calls an authenticated bounded dispatcher.

Use a pinned supported Node runtime satisfying E's declared `>=22.19.0`, then frozen-lock installation, type checking, tests and production build in the new repository. The research host executed Node **22.12.0**, below that declaration; do not confuse the bounded library probe with the production runtime qualification.

### Behavior checks that define success

| Check | Trigger and required outcome | Proof |
|---|---|---|
| Admission before collection | Unknown age, pending/failed VPC, expired/revoked receipt and direct API calls cannot create child rows, accept microphone/upload/text data, call a provider or emit optional analytics. Eligible teen/adult and properly consented child flows work. | HTTP tests plus DB assertions and network capture, including invitation, support and background entry points; no child-name “pending profile.” |
| Household loop | Parent signs in, adds an admitted learner, completes placement, practices a supported skill with voice/text/board, resumes the session and sees an accurate parent report. | Independent browser reproduction on desktop and mobile Safari; fake-clock evidence scheduling plus deployed synthetic checks. |
| RO-5 class 1: generated/unreviewed evidence | Tutor-authored/null-ID check, generated wrong key, unreviewed item or tampered item version cannot produce qualifying evidence or mastery. | Replay original generated-chain/wrong-key cases; inspect evidence provenance and item/key access through actual DB roles. |
| RO-5 class 2: timing | 24 h and 48 h minus 1 ms cannot qualify; 48 h only passes when all other conditions hold. Timer starts after last relevant instructional exposure, not when practice estimate crosses a threshold. | Server-clock boundary tests; missing and roughly day-7 retention check cases; final claim requires separate days/contexts. |
| RO-5 class 3: hidden/repeated help | Cross-session hints, untagged teaching and a later clean answer cannot erase prior help. Same-skill exposure resets eligibility; other-skill exposure does not. | Replay cross-session, same-session-reset and untagged cases; persist exposure before delivering assistance, test uncertain skill mapping fail-safe. |
| RO-5 class 4: practice leakage | Any amount of assisted or unassisted practice contributes **zero** qualifying mastery evidence. Ten clean practice reps can prioritize an independent window, never certify mastery. | Long practice streaks, wrap/model summaries and direct tutor/report write attempts; DB denies qualifying writes. |
| RO-5 class 5: duplicate/partial commits | Concurrent duplicate submissions and retry after a failure at any save boundary produce at most one finalization/evidence/projection change. | PostgreSQL concurrency and fault injection around attempt/evidence/projection/outbox transaction; retry returns the recorded result. |
| RO-5 class 6: independence | Same item, same family, repeated context, or missing family/context cannot count as independent unfamiliar evidence. | Repeated-item/family cases, curated alternate contexts, item exposure history; item ID is not a fallback for context identity. |
| RO-5 class 7: help race | Help arriving after issue or during grading permanently disqualifies that attempt, including help between eligibility read and evidence insert. | Barrier-controlled concurrent help/finalization test under actual PostgreSQL isolation/locking; exposure version/latch checked atomically. |
| RO-5 controls | Sequential duplicates remain safe; client clock fields cannot advance server eligibility; ungraded/null results do not qualify. | Preserve the controls RO-5 did **not** reproduce as vulnerabilities; do not claim they were broken. |
| Report truth | No qualifying evidence means no “mastery confirmed.” Every claim links to rule version and evidence IDs. Parent hears when no quiet window has occurred in 14 days. | Deterministic report tests, job scheduling/retry tests and parent-page evidence inspection. |
| Board and media | All five primitives render/replay; text/table markup is inert; malformed actions reject; speech cancellation stops stale audio and stale-generation writes. No mic permission still permits text. | Reducer/schema tests plus browser screenshots/network capture and mobile permission/cancellation/reconnect scenarios. |
| Provider boundary | No Gemini/Google/Vertex route or credential/import; unknown model and gateway fallbacks reject. Keys remain server-only. | Built source/client/output scans, route manifest and mock/live qualified-endpoint egress assertions across tutor, warm-up, ASR/TTS, extraction and safety. |
| Cost/payment/jobs | Usage reserves then reconciles; exceeded entitlement handles predictably; Stripe duplicate/out-of-order events and retried email jobs do not double-charge or double-deliver. | Test-mode payment fixtures, measured per-route usage, retries and crash recovery, separate job identities. |
| Safety/data lifecycle | Immediate crisis referral/disclosure, breaks and safe logging match current SPEC; no invented guarantee of a human response in minutes. Export/deletion/revocation stay household-scoped. | Flow review plus minimal-data DB/network checks, deletion/restore drill and blocked unauthorized requests. |
| Exclusion/build | Old classroom/admin/storefront/demo endpoints and assets are absent; prompts, approved content, notices and VAD assets exist in the deployed artifact. | Actual Next build/trace manifest, artifact file inventory and direct HTTP checks. |

This is a behavior contract, not permission to mark all inherited tests green by preserving old assertions. In particular, update tests that encode preview bypasses, staff/admin routes, camera telemetry or the superseded safety paging promise.

### Rollback

1. Gate collection and qualifying assessment independently. On admission, provider or evidence-integrity failure, stop new affected work, cancel/drain in-flight work safely and leave a clear maintenance state. Keep processing necessary revocation/deletion and payment reconciliation with their restricted jobs.
2. Roll back application traffic only to a **previously verified safe extracted artifact** with a compatible schema and the same provider/admission restrictions. Before such an artifact exists, rollback is a static maintenance page/offline availability message. **Never route learners back to the old Gemini-capable, false-mastery engine.**
3. Use additive expand/contract migrations and record artifact/schema/rule versions. Do not reverse a production migration by dropping evidence or consent tables. Rebuild projections from eligible ledger events under the intended rule version; preserve corrections and invalidations.
4. Rehearse restore into an isolated database. Replay revocation/deletion tombstones and permitted retention rules before admitting restored records; do not resurrect a deleted learner or revoked consent from a backup. Retain job/payment idempotency identities so retries cannot duplicate credits, charges or email.
5. Move any authorized pre-beta records only with an explicit mapping/provenance ledger and valid consent. Treat old evidence as unverified historical/practice data. Do not backfill “confirmed” from the old `skill_mastery` status. Use synthetic accounts until admission and content gates pass.

## 8. Honest retained-code percentage

The denominator is **599,280 physical lines in 2,818 E tracked code files**, identified by `git ls-files` and extensions TS/TSX/JS/JSX/MJS/CJS/CSS/SQL. It includes comments, tests and workspace build source; excludes node_modules, Markdown, JSON/lockfiles, media and git history. No claim that those lines are equally valuable is intended.

| Numerator | Lines / files | Percentage of E denominator | Meaning |
|---|---|---|---|
| Conditional application copy/adapt input, including types and quarantined board | 47,522 lines / 338 code files; 339 files total | **7.93%** | Whole source files considered for the extraction, before seam edits and new code. |
| Same candidate plus E test-review/port inputs | 59,340 lines / 392 code files; 394 files total | **9.90%** | Broad retained **input footprint**. Some obsolete test cases are replaced or omitted; this is not a final copied-line count. |
| Application input excluding the 33-file board quarantine group | 41,365 lines / 305 code files; 306 files total | **6.90%** | Core before the replacement presenter/type adapter is added; not independently runnable and not a final percentage. |

Reproduce the counts with source trace summary (`ro6-source-trace-summary.json`), copy/adapt footprint (`ro6-copy-adapt-footprint.json`) and tracer (`ro6-trace.cjs`). The conditional runtime-only graph, excluding explicit type-only traversal, is 44,800 lines; use the 47,522 count when describing build inputs. The graph stops at specified seams, so it deliberately counts the old seam files' current lines even though their implementation changes.

A contributes **zero runtime imports**; its seven design/test input files total 1,293 lines out of 71,796 tracked code lines (**1.80% of A**). That is a reference/adaptation footprint, not a claim to transplant those migrations. Do not combine A and E denominators to manufacture a more attractive percentage.

**The final retained-code percentage does not yet exist.** It can be measured only from the extracted diff after provider, consent, assessor, presenter and build changes. The figures above do not measure security isolation, legal permission, deployment size, content coverage, implementation effort, dependency count or completion. A one-line import can cross a much larger boundary than thousands of isolated tutor lines.

## 9. What was verified, and what remains open

Executed a read-only literal import/export/dependency walk using the cached TypeScript parser. The conditional graph has no unresolved literal paths **after applying its proposed seam/filter assumptions**; it does not prove those edits compile. Traversed E's lock recursively, including optional dependencies and peer-qualified versions. Collected exact-version licence evidence where accessible and marked unknowns individually.

Compiled E's 16 DSL source files into this research directory with cached TypeScript 6.0.3: zero diagnostics, emitted output, 71 exports. Executed the original whiteboard action validator/reducer/table formatter against a harmless markup fixture and observed markup preservation. These bounded results are in build probe (`ro6-build-probe.json`) and probe source (`ro6-probe.cjs`). The probe's unused KaTeX stub did not exercise math rendering. Successful DSL compilation does not establish board provenance, browser safety or application deployability.

**No full Next build or deployment was run.** Both repositories lacked `node_modules`/`.next`; resolving Next in E returned `MODULE_NOT_FOUND`. Shell package-registry access failed, and the preferred browser could not start within the sandbox; primary source browsing used the available web fallback. No packages were installed into either checkout. No actual `.nft.json` or production artifact trace existed to inspect. PostgreSQL role/locking behavior remains unverified, consistent with RO-5's documented sandbox limitation. These are required builder/reviewer evidence, not reasons to label a static graph as a build trace.

Final read-only verification found both source HEADs unchanged, clean working trees, and **342/342** recorded source/manifest/licence hashes matching. All local links in this report resolved. Verification record (`ro6-final-verification.json`).

Three findings could materially alter this boundary:

1. A pinned permissible source/rights chain for the board could permit the conditional presenter reuse; absent that, the bounded replacement remains necessary.
2. Qualified child-appropriate provider and VPC choices change the adapter packages, policy records, cost and credential surface. Until chosen and verified, no live child-data path is enabled.
3. Actual clean Linux/Next build and installed licence/native-asset inventory can reveal missing dynamic assets or obligations. Update the whitelist/lock and rerun the independent behavior checks before release.

**Handoff:** build this household slice in the extracted repository; keep Gemini, club/classroom/admin applications and demo machinery out; close admission, evidence authority, board provenance and installed-artifact gates before beta. No source repair, licence clearance, key rotation or deployment is claimed by this research report.

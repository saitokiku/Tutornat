# Claims Register — what marketing copy may, may not, and must not say

Status: DRAFT by VP of Marketing (AI role). Governs every file under company/marketing/**. Evidence labels: owner statement / source inspection / worker report / independently executed / hypothesis / not tested. A claim moves up only with named evidence in this file; no claim is promoted on an exit code, a role name, or a worker's self-report.

Scope note: marketing inspected the candidate's file list and found copy strings in redesign/candidate/copy.js and shell-copy.js. Marketing has not executed the candidate and does not vouch for any behavior; "worker report" and "independently executed" below refer to engineering/coordinator evidence named in company/OPERATING_BRIEF.md.

## A. Allowed now (with required wording)
| Claim | Evidence level | Source | Required wording / limit |
|---|---|---|---|
| Parent-first schoolwork organization for US K–8 families | owner statement | DIRECTION.md | "for parents of K–8 students"; no outcome attached |
| Parent creates and reviews schoolwork; child can start, work, ask for help, report stuck/done | worker report (modules), independently executed shell replay 30/30 (coordinator) — not a full connected-flow pass | OPERATING_BRIEF.md; company/coordinator-evidence/resume-shell-20261002T030547Z/report.json | describe as what the prototype "shows"; say "prototype" |
| Shared activity record lets a parent respond to the specific work recorded | worker report | redesign/handoffs/LEARNING.md (named, not read by marketing) | "recorded work," never "verified work" |
| English and Spanish interface text exists | source inspection (grep of copy.js: parallel `en`/`es` blocks, e.g. `disclosure`, `state_stuck` "Atascado", `ws_help_requested` "Solicitada", `ws_k2_stuck` "Necesito ayuda", `ws_k2_done` "Lo hice", `state_complete_self_reported` "Hecha (autoinforme)") | redesign/candidate/copy.js | "available in English and Spanish (Spanish still under review)" |
| The prototype itself discloses its limits in-product | source inspection: copy.js `disclosure` ("AI tutoring and school connections are simulated"), `intake_p` ("Nothing here is AI"), `draft_prov` ("Not AI"), `ws_voice_note` ("no microphone or audio is used"), `ws_check_match` ("Matching once is not mastery"), `rec_mastery`, `stuck_saved` ("No se envió nada a ningún lado") | redesign/candidate/copy.js lines 12, 44, 53, 55, 63, 77, 180 | marketing copy may say "the prototype says plainly what it does not do"; it may not quote these as features |
| Student completion is labeled self-reported | source inspection: `state_complete_self_reported` "Done (self-reported)" / "Hecha (autoinforme)" | copy.js line 120 (ES) | use "done (self-reported)" wherever completion is mentioned |
| Family-authored text stays verbatim across language switch | owner/brief rule; not tested by marketing | OPERATING_BRIEF.md Boundaries | may be stated as a design rule: "your words stay exactly as you wrote them" only after the Product Language Editor confirms a test exists |
| DUE / WORK / SUGGESTED are distinct; chips select | owner/brief rule; not tested by marketing | OPERATING_BRIEF.md | explain, don't sell |
| Offline, in-memory, made-up example data; no accounts | source inspection (no network per replay) | report.json; OPERATING_BRIEF.md | must appear next to any demo |
| Math and literacy receive first instructional attention; other subjects organized only | owner statement | DIRECTION.md §2 | never "full curriculum" |
| Human tutors are a later add-on, not required | owner statement | DIRECTION.md | do not advertise tutors as available |

## B. Hypotheses — may appear only as questions we are testing, never as benefits
| Hypothesis | Evidence level | What would be needed |
|---|---|---|
| Parents chase less | hypothesis | adult research counts (kit §4), later real-use data |
| Children's outcomes improve / independence grows | hypothesis | real use over time with independent checks; out of reach for a synthetic demo |
| Parents value seeing actual work over "done" | hypothesis | kit §4 signal counts |
| Bilingual EN/ES households are a distinct first segment | hypothesis | owner Q1 + recruitment response |
| There is demand; a parent would pay | hypothesis | no pricing research authorized; never in v1 copy |
| K–2 / 3–5 / 6–8 experiences feel appropriately different | hypothesis (design bands) | owner-judged screens per band |

## C. Blocked — must not appear in any marketing artifact until this register changes
| Blocked claim or wording | Why | Unblock condition |
|---|---|---|
| "AI tutor," "AI companion," "learns with your child," "smart help," any implication help is generated live | demo assistance is deterministic and scripted; no model integration | real, disclosed AI integration shipped and reviewed |
| Voice, "talk to it," audio, read-aloud | no audio exists; voice is a later simulation at most | audio implementation + accessibility review |
| Accounts, login, "syncs across devices," cloud, "pick up on your phone" | in-memory only | backend/auth shipped |
| Mastery, "learned," progress %, grades, scores, "on track," "ahead/behind" | completion ≠ mastery; no assessment | reviewed content + independent checks + owner approval |
| Efficacy: "improves grades," "proven," "research-backed," "better outcomes," "less chasing" | hypotheses, no users | real-use evidence with source and scope |
| "COPPA/FERPA compliant," "private," "secure," "safe for kids" | no compliance work; deletion/retention open in BACKLOG.md | legal/compliance review |
| "Native Spanish," "fully bilingual," "reviewed by Spanish-speaking educators" | draft Spanish unvalidated | native educational-Spanish review documented here |
| "Works with your school," teacher messaging, portal import, "we pull assignments" | no integrations; automation contract forbids acting as child/parent | integration shipped + permission design |
| User counts, "families love," testimonials, "parents told us" | no users beyond owner | research synthesis with n |
| Tutors "available," marketplace, booking | deferred by owner | later version |
| "Complete curriculum," "all subjects taught" | owner: organization ≠ validated instruction | reviewed coverage |
| Any mobile claim ("works on your phone") | 320px stale-status issue open | mobile fix verified |
| Any production, launch, "available now," pricing, "free" | nothing is deployed; no pricing decision | owner release decision |

## D. Word rules (apply to EN and ES)
- "completed" / "done" ≠ "learned," "mastered," "understood."
- "asked for help" ≠ "got help" ≠ "was taught." The prototype records a request; it does not promise a reply.
- "recorded" ≠ "verified" ≠ "graded."
- "prototype," "example data," "early" stay in any demo context.
- Spanish strings carry "(borrador sin validar)" in internal files until unblocked.
- No praise language, no exclamation marks, no "unlock," "supercharge," "effortless," "seamless," "empower," "journey." (Owner rule: nothing that looks, sounds or feels like AI slop.)

## E. Open verification items for the Product Language Editor
1. Confirm whether a test asserts verbatim preservation of authored text across locale switch; cite file and test name, or record "not tested."
2. List every Spanish string in copy.js / shell-copy.js that contains a blocked claim or an outcome word.
3. Confirm the candidate UI labels for help/stuck/done and whether any label implies a reply.
4. Wording risk found by grep: the support option is labeled `support_voice` "Voice demo" / "Demo de voz" (copy.js lines 31, 124, 192) while `ws_voice_note` states no audio exists. A button named "Voice demo" can read as a voice feature on a screen. Propose a label that does not promise audio (e.g. "Read-along sample (text)"); marketing must never echo "voice."
5. Register: candidate student strings use tú ("Toca un botón grande", "Tu madre/padre"); the parent is "madre/padre". POSITIONING.md draft Spanish uses tú; the recruitment draft uses usted. Decide one register per audience and record it in GLOSSARY.md.
6. `rec_student_p` / `rec_student_p_35` / `rec_k2_p` differ by band (6–8 / 3–5 / K–2) in what the parent can see. Check that marketing's band descriptions in POSITIONING.md §1 do not overstate what each band's screen actually shows.

# AI evals

`evals/tutor/sample_cases.json` holds 10 behavioral cases for the tutor prompt;
`evals/tutor/rubric.md` defines pass criteria. Run them manually today (paste a
case into the tutor and judge with the rubric) or wire the runner later: for
each case, call /api/chat with the case messages and have CLAUDE_MODEL_FAST
judge the response against the rubric's checks. Re-run before any prompt change
ships (system_prompt_versions requires admin approval by policy).

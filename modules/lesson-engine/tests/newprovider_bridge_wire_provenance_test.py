#!/usr/bin/env python3
"""RED-before-GREEN: the bridge must PROVE provider identity, not assert it.

Four properties, each a refusal the previous bridge did not have:

  1. Request provenance is read from the ACTUAL outbound body handed to the
     provider client, never from the module constants we hoped were applied.
  2. A response with no wire model is a typed refusal (ProviderIdentityUnproved),
     not a success whose provenance quietly reports the configured name.
  3. A response whose wire model is not the pinned one is a typed refusal
     (ProviderIdentityMismatch) — a silent source/fallback adaptation.
  4. Endpoint host is checked EXACTLY (urlparse hostname) before the credential
     is used, so `api.anthropic.com.evil.test` and OpenRouter are refused.

Plus: emitted failures carry fixed codes and HTTP status only. No str(exc), no
provider failure prose, no prompt echo — stdout is read by server.mjs and shown
to a learner.

Additive: touches no existing test. Runnable under pytest or directly.
"""
import json
import pathlib
import sys

LESSON = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(LESSON))

import ai_bridge  # noqa: E402


# --- 1. request provenance comes from the real body -------------------------

def test_observed_request_facts_are_read_from_the_outbound_body():
    """Not from ai_bridge.MODEL / MAX_TOKENS: a body the adapter rewrote must show
    the rewrite, otherwise provenance is a restatement of our own config."""
    observed = ai_bridge._observe_request(
        {
            "model": "claude-opus-5-20991231",
            "max_tokens": 64000,
            "thinking": {"type": "adaptive", "display": "summarized"},
            "output_config": {"effort": "high"},
            "messages": [{"role": "user", "content": "SECRET PROMPT"}],
            "system": "SECRET SYSTEM",
        }
    )
    assert observed["model"] == "claude-opus-5-20991231"
    assert observed["max_tokens"] == 64000
    assert observed["reasoning"] == {
        "thinking_type": "adaptive",
        "effort": "high",
        "budget_tokens": None,
    }
    # No prompt / system text may ride along in provenance.
    blob = json.dumps(observed)
    assert "SECRET" not in blob, "observed request leaked prompt or system text"


def test_observed_request_reports_absent_reasoning_as_none_not_as_requested():
    observed = ai_bridge._observe_request({"model": "m", "max_tokens": 1})
    assert observed["reasoning"] == {
        "thinking_type": None, "effort": None, "budget_tokens": None,
    }


# --- 2/3. identity must be proved ------------------------------------------

def test_missing_wire_model_is_refused_as_unproved():
    assert ai_bridge._identity_error(None) == "ProviderIdentityUnproved"
    assert ai_bridge._identity_error("") == "ProviderIdentityUnproved"


def test_mismatched_wire_model_is_refused_as_mismatch():
    assert ai_bridge._identity_error("claude-sonnet-4-5") == "ProviderIdentityMismatch"
    assert ai_bridge._identity_error("gpt-5") == "ProviderIdentityMismatch"


def test_pinned_wire_model_and_its_dated_snapshot_are_accepted():
    assert ai_bridge._identity_error(ai_bridge.MODEL) is None
    assert ai_bridge._identity_error(ai_bridge.MODEL + "-20260401") is None


def test_a_different_model_sharing_our_prefix_boundary_is_not_accepted():
    """`claude-opus-50` must not pass as `claude-opus-5`."""
    assert ai_bridge._identity_error("claude-opus-50") == "ProviderIdentityMismatch"


# --- 4. endpoint host checked exactly, before credential use ----------------

def test_canonical_anthropic_host_is_accepted():
    assert ai_bridge._endpoint_error("https://api.anthropic.com") is None
    assert ai_bridge._endpoint_error("https://api.anthropic.com/v1") is None


def test_lookalike_host_is_refused_exactly_not_by_suffix_match():
    for bad in (
        "https://api.anthropic.com.evil.test/v1",
        "https://evil.test/api.anthropic.com",
        "https://openrouter.ai/api/v1",
        "http://api.anthropic.com",   # plaintext: credential must not go out
        "",
        None,
    ):
        assert ai_bridge._endpoint_error(bad) == "NonCanonicalEndpoint", bad


# --- emitted failures are sanitized ----------------------------------------

def test_failure_payload_carries_a_fixed_code_and_status_only():
    class Boom(Exception):
        status_code = 429

    payload = ai_bridge._failure(Boom("rate limit for key sk-ant-REAL-SECRET"))
    assert payload["error"] == "ProviderHTTPError"
    assert payload["status"] == 429
    assert "detail" not in payload, "no free-text detail may be emitted"
    assert "SECRET" not in json.dumps(payload)


def test_typed_bridge_errors_keep_their_own_code():
    payload = ai_bridge._failure(ai_bridge.BridgeError("ProviderIdentityMismatch"))
    assert payload["error"] == "ProviderIdentityMismatch"
    assert payload["status"] is None


def test_unknown_exceptions_collapse_to_one_opaque_code():
    payload = ai_bridge._failure(RuntimeError("/Users/man/.hermes path and key leak"))
    assert payload["error"] == "BridgeFailure"
    assert "leak" not in json.dumps(payload)


def test_bad_request_detail_is_one_constant_regardless_of_input():
    assert ai_bridge._prompt_or_none("not json at all") is None
    assert ai_bridge._prompt_or_none('{"prompt": ""}') is None
    assert ai_bridge._prompt_or_none('{"prompt": 7}') is None
    assert ai_bridge._prompt_or_none('{"prompt": "%s"}' % ("x" * 30000)) is None
    assert ai_bridge._prompt_or_none('{"prompt": " hi "}') == " hi "


def test_only_allowlisted_failure_codes_can_reach_stdout():
    """A BridgeError's message is emitted as the error code, so an unexpected raise
    with interpolated text would publish it. Membership-checked, not trusted."""
    leaky = ai_bridge.BridgeError("auth failed for sk-ant-REAL-SECRET at /Users/man")
    payload = ai_bridge._failure(leaky)
    assert payload["error"] == "BridgeFailure"
    assert "SECRET" not in json.dumps(payload)
    assert "Users" not in json.dumps(payload)


def test_every_code_the_bridge_raises_is_in_the_allowlist():
    """Guards the inverse mistake: a new typed refusal that silently degrades to
    BridgeFailure because nobody added it to the allowlist."""
    for code in ("ProviderIdentityUnproved", "ProviderIdentityMismatch",
                 "NonCanonicalEndpoint"):
        assert ai_bridge._failure(ai_bridge.BridgeError(code))["error"] == code


def test_provider_failure_prose_is_never_emitted():
    src = (LESSON / "ai_bridge.py").read_text(encoding="utf-8")
    assert '"detail": str(' not in src
    assert "failure_reason\")[" not in src, "provider failure prose must not be sliced into a reply"


def test_bridge_pins_the_request_path_that_routes_through_the_hooked_seam():
    """The streaming path calls `request_client.messages.stream(**kwargs)` inline
    (agent/chat_completion_helpers.py:3492) and never reaches
    `_anthropic_messages_create`, so instrumenting that seam captures nothing unless
    the bridge also pins the non-streaming dispatch. Proven live: a run with the hook
    installed but streaming left on returned text with every observed field null."""
    src = (LESSON / "ai_bridge.py").read_text(encoding="utf-8")
    assert "_disable_streaming = True" in src, (
        "bridge must pin the non-streaming dispatch or the boundary hook is dead code"
    )


def test_provenance_keeps_requested_and_observed_as_independent_fields():
    """`reasoning_effort_requested` is what we asked; `observed_request_reasoning`
    is what the body actually carried. Collapsing them hides a dropped control."""
    src = (LESSON / "ai_bridge.py").read_text(encoding="utf-8")
    for field in (
        "model_wire", "model_wire_proved", "provider_actual", "endpoint_host",
        "reasoning_effort_requested", "observed_request_reasoning",
        "observed_request_model",
    ):
        assert field in src, "provenance must export %s" % field


if __name__ == "__main__":
    failed = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print("PASS", name)
            except Exception as exc:
                failed += 1
                print("FAIL", name, "->", type(exc).__name__, exc)
    print("---", "FAILURES:", failed)
    raise SystemExit(1 if failed else 0)

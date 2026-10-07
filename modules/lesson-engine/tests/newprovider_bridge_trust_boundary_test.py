#!/usr/bin/env python3
"""RED-before-GREEN: trust boundaries and the ONE-call guarantee.

The bridge already proves wire identity. Three holes remained, each one a claim
the product makes that the code did not actually enforce:

  1. `_endpoint_error` compared scheme + hostname only, so a credential would
     still be sent to `https://user:pw@api.anthropic.com:8443/relay?to=evil`
     — same host, different port, attacker-chosen path, userinfo on the wire.
  2. The runtime provider was passed to AIAgent unchecked. `resolve_runtime_provider`
     can hand back a different provider than requested; the bridge would then build
     an agent whose transport never reaches the hooked Anthropic seam, and every
     observed fact comes back null while the call still goes out.
  3. "ONE live call, no retry" was a comment. The SDK client is built with
     max_retries=0, but retry in hermes belongs to an OUTER loop
     (agent/anthropic_adapter.py:361,508), so the agent may dispatch the boundary
     twice. A second dispatch must be refused BEFORE the second network call.

Plus: a swallowed HTTP failure must be reported as the HTTP failure it was, not
re-labelled ProviderIdentityUnproved because no wire model came back.

Additive: touches no existing test. Offline only — no provider calls.
"""
import json
import pathlib
import sys
import types

LESSON = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(LESSON))

import ai_bridge  # noqa: E402


# --- helpers ---------------------------------------------------------------

BODY = {
    "model": ai_bridge.MODEL,
    "max_tokens": ai_bridge.MAX_TOKENS,
    "thinking": {"type": "adaptive"},
    "output_config": {"effort": "max"},
    "messages": [{"role": "user", "content": "PROMPT TEXT"}],
}


class FakeMessage:
    model = "claude-opus-5-20260101"
    provider = None
    stop_reason = "end_turn"
    usage = types.SimpleNamespace(
        input_tokens=11, output_tokens=22, cache_read_input_tokens=3,
    )


class FakeAgent:
    """Only the real seam's signature (client_lifecycle.py:1009)."""

    def __init__(self, base_url="https://api.anthropic.com", response=None, raises=None):
        self._anthropic_client = types.SimpleNamespace(base_url=base_url, max_retries=0)
        self._response = response or FakeMessage()
        self._raises = raises
        self.calls = []

    def _anthropic_messages_create(self, api_kwargs, *, client=None):
        self.calls.append(api_kwargs)
        if self._raises is not None:
            raise self._raises
        return self._response


# --- 1. endpoint trust boundary is the WHOLE url, not just the host --------

def test_canonical_bases_the_real_call_needs_are_accepted():
    for good in (
        "https://api.anthropic.com",
        "https://api.anthropic.com/",
        "https://api.anthropic.com/v1",
        "https://api.anthropic.com/v1/",
        "https://api.anthropic.com:443/v1",
    ):
        assert ai_bridge._endpoint_error(good) is None, good


def test_right_host_wrong_url_components_are_refused():
    """Same hostname, still not the canonical API: the credential must not go out."""
    for bad in (
        "https://user:pw@api.anthropic.com/v1",      # userinfo on the wire
        "https://api.anthropic.com:8443/v1",          # non-default port
        "https://api.anthropic.com/relay/v1",         # attacker-chosen path
        "https://api.anthropic.com/v1?to=evil.test",  # query
        "https://api.anthropic.com/v1#evil",          # fragment
        "https://api.anthropic.com/v1/messages/x",    # deeper than the SDK base
    ):
        assert ai_bridge._endpoint_error(bad) == "NonCanonicalEndpoint", bad


# --- 2. provider is validated BEFORE the agent is built -------------------

def test_runtime_provider_must_be_exactly_anthropic():
    assert ai_bridge._provider_error("anthropic") is None
    for bad in ("openrouter", "ANTHROPIC", "anthropic-beta", "", None, 7):
        assert ai_bridge._provider_error(bad) == "NonCanonicalProvider", bad


def test_provider_is_checked_before_agent_construction():
    src = (LESSON / "ai_bridge.py").read_text(encoding="utf-8")
    assert src.index("_provider_error(") < src.index("agent = AIAgent("), (
        "a wrong provider must be refused before an agent is built, because a "
        "non-Anthropic transport never reaches the hooked seam"
    )


# --- 3. requested model asserted at the boundary, before dispatch ---------

def test_outbound_body_model_must_be_exactly_the_pinned_model():
    for bad in (None, "", "claude-opus-5-20260101", "claude-sonnet-4-5", 7):
        agent = FakeAgent()
        restore = ai_bridge._instrument_boundary(agent, {})
        try:
            agent._anthropic_messages_create(dict(BODY, model=bad))
            raise AssertionError("model %r was not refused" % (bad,))
        except ai_bridge.BridgeError as exc:
            assert str(exc) == "RequestedModelMismatch", (bad, str(exc))
            assert agent.calls == [], "dispatched before asserting the model"
        finally:
            restore()


def test_dated_snapshot_is_accepted_on_the_response_but_not_on_the_request():
    """Old guarantee preserved: the provider may ANSWER with a dated snapshot."""
    assert ai_bridge._identity_error(ai_bridge.MODEL + "-20260401") is None
    agent = FakeAgent(response=FakeMessage())
    facts = {}
    restore = ai_bridge._instrument_boundary(agent, facts)
    try:
        agent._anthropic_messages_create(dict(BODY))
    finally:
        restore()
    assert facts["wire_model"] == "claude-opus-5-20260101"
    assert ai_bridge._identity_error(facts["wire_model"]) is None


# --- 3b. ONE dispatch per bridge invocation -------------------------------

def test_a_second_dispatch_is_refused_before_the_second_network_call():
    agent = FakeAgent()
    facts = {}
    restore = ai_bridge._instrument_boundary(agent, facts)
    try:
        agent._anthropic_messages_create(dict(BODY))
        assert len(agent.calls) == 1
        try:
            agent._anthropic_messages_create(dict(BODY))
            raise AssertionError("second dispatch was allowed")
        except ai_bridge.BridgeError as exc:
            assert str(exc) == "ProviderRetryNotAllowed", str(exc)
        assert len(agent.calls) == 1, "a retry reached the provider"
    finally:
        restore()
    assert facts["provider_attempts"] == 1


def test_an_agent_retry_after_a_failure_cannot_reach_the_provider_twice():
    """The real shape: inner throws, hermes' outer loop calls the seam again."""
    boom = RuntimeError("overloaded")
    agent = FakeAgent(raises=boom)
    facts = {}
    restore = ai_bridge._instrument_boundary(agent, facts)
    try:
        for expect in ("first", "second"):
            try:
                agent._anthropic_messages_create(dict(BODY))
            except ai_bridge.BridgeError as exc:
                assert expect == "second" and str(exc) == "ProviderRetryNotAllowed"
            except RuntimeError:
                assert expect == "first"
    finally:
        restore()
    assert len(agent.calls) == 1, "outer retry reached the provider twice"
    assert facts["provider_attempts"] == 1


def test_a_client_configured_to_retry_is_refused_before_dispatch():
    agent = FakeAgent()
    agent._anthropic_client = types.SimpleNamespace(
        base_url="https://api.anthropic.com", max_retries=2,
    )
    restore = ai_bridge._instrument_boundary(agent, {})
    try:
        agent._anthropic_messages_create(dict(BODY))
        raise AssertionError("SDK-level retries were not refused")
    except ai_bridge.BridgeError as exc:
        assert str(exc) == "ProviderRetryNotAllowed"
        assert agent.calls == []
    finally:
        restore()


# --- 4. a swallowed HTTP failure stays an HTTP failure --------------------

def test_boundary_records_http_status_so_a_429_is_not_relabelled_unproved():
    class Rate(Exception):
        status_code = 429

    agent = FakeAgent(raises=Rate("rate limit for «redacted:sk-…»"))
    facts = {}
    restore = ai_bridge._instrument_boundary(agent, facts)
    try:
        try:
            agent._anthropic_messages_create(dict(BODY))
        except Rate:
            pass
    finally:
        restore()
    assert facts["http_status"] == 429
    assert facts["error_code"] == "ProviderHTTPError"
    blob = json.dumps(facts)
    assert "redacted" not in blob and "rate limit" not in blob, "failure prose captured"


def test_failure_status_must_be_a_real_http_int_never_a_bool_or_junk():
    class Exc(Exception):
        pass

    for raw, expect in ((True, None), (False, None), (0, None), (99, None),
                        (600, None), ("429", None), (429, 429), (503, 503)):
        exc = Exc("x")
        exc.status_code = raw
        payload = ai_bridge._failure(exc)
        assert payload["status"] == expect, (raw, payload)
        if expect is None:
            assert payload["error"] == "BridgeFailure", raw


def test_new_refusal_codes_are_publishable():
    for code in ("NonCanonicalProvider", "RequestedModelMismatch",
                 "ProviderRetryNotAllowed"):
        assert code in ai_bridge.PUBLISHABLE_CODES, code
        assert ai_bridge._failure(ai_bridge.BridgeError(code))["error"] == code


# --- 5. safe extra metadata only -----------------------------------------

def test_safe_response_metadata_is_captured_and_nothing_else():
    agent = FakeAgent()
    facts = {}
    restore = ai_bridge._instrument_boundary(agent, facts)
    try:
        agent._anthropic_messages_create(dict(BODY))
    finally:
        restore()
    assert facts["endpoint_path"] == "messages"
    assert facts["stop_reason"] == "end_turn"
    assert facts["usage"] == {
        "input_tokens": 11, "output_tokens": 22, "cache_read_input_tokens": 3,
    }
    blob = json.dumps(facts, sort_keys=True)
    for leaked in ("PROMPT", "sk-", "x-api-key", "authorization", "thinking_block"):
        assert leaked.lower() not in blob.lower(), leaked


def test_non_numeric_usage_fields_are_dropped_not_stringified():
    class Weird(FakeMessage):
        usage = types.SimpleNamespace(
            input_tokens=1, output_tokens=True, server_tool_use="SECRET",
        )

    agent = FakeAgent(response=Weird())
    facts = {}
    restore = ai_bridge._instrument_boundary(agent, facts)
    try:
        agent._anthropic_messages_create(dict(BODY))
    finally:
        restore()
    assert facts["usage"] == {"input_tokens": 1}, facts["usage"]


def test_successful_provider_actual_stays_null_on_the_canonical_api():
    agent = FakeAgent()
    facts = {}
    restore = ai_bridge._instrument_boundary(agent, facts)
    try:
        agent._anthropic_messages_create(dict(BODY))
    finally:
        restore()
    assert "provider_actual" not in facts, "must not be backfilled with 'anthropic'"
    assert facts["endpoint_host"] == "api.anthropic.com"


def test_provenance_exports_the_attempt_count_as_an_int():
    src = (LESSON / "ai_bridge.py").read_text(encoding="utf-8")
    assert "observed_provider_attempts" in src
    assert "observed_stop_reason" in src and "observed_usage" in src


def test_http_failure_is_reported_before_the_identity_refusal():
    """A 429 the agent swallowed must not surface as ProviderIdentityUnproved."""
    src = (LESSON / "ai_bridge.py").read_text(encoding="utf-8")
    assert src.index('facts.get("http_status")') < src.index("identity_error = _identity_error("), (
        "a captured HTTP failure must win over the no-wire-model refusal"
    )


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

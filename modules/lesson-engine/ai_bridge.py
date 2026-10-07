#!/usr/bin/env python3
"""Tool-less, memory-less bridge to ONE live Opus (claude-opus-5) call.

Invoked as a subprocess by lesson/server.mjs:

    ai_bridge.py lesson|feedback   # JSON request on stdin, JSON reply on stdout

Reply is always a single JSON object on stdout:
    {"ok": true,  "text": "<model text>", "provenance": {...}}
    {"ok": false, "error": "<fixed code>", "status": <int|null>, "provenance": {...}}

Guarantees (what makes this honest rather than convenient):
  * ONE live call per process. No fallback chain, no retry, no synthetic lesson:
    a failure is reported as a failure, never as fake success.
  * No tools, no memory, no context files, no skills, no trajectory persistence.
    The learner prompt is the ONLY context the model sees.
  * Credentials are resolved INSIDE this process by Hermes' own resolver and are
    never printed, logged or written to disk. The endpoint host is asserted to be
    the canonical Anthropic API *before* the credential leaves the process.
  * Provenance separates what we ASKED for from what the wire actually did.
    Request facts are read from the body the provider client was handed, and
    identity is read from the provider's own response; neither is ever inferred
    from this module's constants. An unproved or mismatched identity is a typed
    REFUSAL, not a success carrying the configured name.
  * Emitted failures carry a fixed code and an HTTP status only. Provider prose,
    exception text and paths never reach stdout: server.mjs shows it to a learner.

Runtime pattern follows /Users/man/hermes-router-integration/scripts/run_runtime.py
and probe_role_jev.py:359-410 (make_agent / resolve_runtime_provider).
"""
from __future__ import annotations

import contextlib
import io
import json
import os
import sys
from datetime import datetime, timezone
from urllib.parse import urlparse

PROVIDER = "anthropic"
# MUST equal `const MODEL` in lesson/server.mjs. The server pins claude-opus-5 and
# prints the configured name to the learner as provenance; a bridge asking for a
# different model generates the lesson with a model nobody asked for while the UI
# keeps reporting the pinned one. tests/newprovider_bridge_model_parity_test.py locks
# the two together.
MODEL = "claude-opus-5"
# The provider itself states 128000 is this model's maximum output allowance
# (agent.anthropic_adapter._get_anthropic_max_output('claude-opus-5') == 128000).
# Thinking tokens count toward the limit, so a smaller ceiling starves a
# maximum-reasoning run and is not a maximum-reasoning result.
MAX_TOKENS = 128000
HERMES_AGENT = "/Users/man/.hermes/hermes-agent"

# Credential-bearing requests go to this host and no other. Compared as an exact
# parsed hostname, never by suffix: `api.anthropic.com.evil.test` ends with the
# canonical name. OpenRouter and other relays re-roll the served model per request,
# so they cannot prove Opus identity for this product's claim.
CANONICAL_HOST = "api.anthropic.com"
# The only path components a credential-bearing base_url may carry. The SDK is
# handed either the bare origin or the `/v1` form; anything else (a relay path, a
# query, a fragment, userinfo, a non-default port) is a different endpoint that
# merely shares a hostname.
CANONICAL_PATHS = frozenset({"", "/", "/v1", "/v1/"})
# Anthropic's documented stop reasons. An allowlist, because an unknown value is
# provider-controlled text and this provenance is written to disk and shown to a learner.
STOP_REASONS = frozenset({
    "end_turn", "max_tokens", "stop_sequence", "tool_use", "pause_turn",
    "refusal", "model_context_window_exceeded",
})
# Numeric token counters only. Never the whole usage object: it grows new
# provider-defined string fields between SDK versions.
USAGE_FIELDS = ("input_tokens", "output_tokens", "cache_read_input_tokens",
                "cache_creation_input_tokens")

# The subprocess budget is advisory here; server.mjs enforces the HARD timeout by
# killing this process. run_budget_seconds has not been proven to be a hard stop.
RUN_BUDGET_SECONDS = 150.0

# Request-validation replies are a constant: the rejected input must not be echoed.
BAD_REQUEST = "prompt must be a non-empty string of at most 24000 characters"
MAX_PROMPT_CHARS = 24000

SYSTEM = (
    "You are a lesson generator for a local owner-test prototype. The learner's typed "
    "goal supplies the topic: any safe academic or practical subject is in scope, for a "
    "self-reported age from 1 to 120. Age guides vocabulary and difficulty only; it is "
    "not an assessment of ability, not eligibility and not consent. You reply with ONE "
    "JSON object and nothing else: no prose, no markdown, no code fences. You never "
    "include HTML, scripts, links or URLs in any string. You are not a curriculum "
    "authority: your answer keys are generated, not reviewed. If a goal is unsafe to "
    'teach, reply {"refusal": "<one short sentence>"} rather than a partial lesson.'
)


class BridgeError(Exception):
    """A refusal with a fixed, publishable code as its only payload."""


# The ONLY strings that may appear as an `error` on stdout. A BridgeError's message is
# emitted as the code, so an unexpected raise carrying interpolated text (a path, a
# credential prefix, provider prose) would publish it; membership is checked, not trusted.
PUBLISHABLE_CODES = frozenset({
    "ProviderIdentityUnproved", "ProviderIdentityMismatch", "NonCanonicalEndpoint",
    "ProviderFailure", "ProviderHTTPError", "BadMode", "BadRequest", "BridgeFailure",
    "NonCanonicalProvider", "RequestedModelMismatch", "ProviderRetryNotAllowed",
})


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _emit(payload: dict) -> None:
    # stdout carries exactly one JSON object; everything else went to /dev/null.
    sys.stdout.write(json.dumps(payload))
    sys.stdout.flush()


def _prompt_or_none(raw: str):
    """The request's prompt, or None if the request is unusable. Never raises, so the
    reply cannot carry parser text describing the caller's malformed input."""
    try:
        request = json.loads(raw or "{}")
    except Exception:
        return None
    if not isinstance(request, dict):
        return None
    prompt = request.get("prompt")
    if not isinstance(prompt, str) or not prompt.strip() or len(prompt) > MAX_PROMPT_CHARS:
        return None
    return prompt


def _http_status(exc: BaseException):
    """`exc.status_code` when it is a real HTTP status, else None. `bool` is excluded:
    `True` is an int and would be emitted as a status of `true`."""
    status = getattr(exc, "status_code", None)
    if isinstance(status, bool) or not isinstance(status, int):
        return None
    return status if 100 <= status <= 599 else None


def _failure(exc: BaseException) -> dict:
    """Fixed code + HTTP status. No str(exc): provider errors quote request bodies,
    URLs and sometimes the credential prefix, and this reply is rendered to a learner."""
    status = _http_status(exc)
    if isinstance(exc, BridgeError):
        code = str(exc)
    elif status is not None:
        code = "ProviderHTTPError"
    else:
        code = "BridgeFailure"
    if code not in PUBLISHABLE_CODES:
        code = "BridgeFailure"
    return {"ok": False, "error": code, "status": status}


def _observe_request(api_kwargs: dict) -> dict:
    """Request facts as the provider client actually received them.

    Read from the outbound body, not from this module's constants: the adapter maps
    reasoning_config through its own effort table and clamps max_tokens, so a control
    we asked for and a control that was actually sent are different claims. Carries no
    prompt, system text or message content.
    """
    body = api_kwargs or {}
    thinking = body.get("thinking") if isinstance(body.get("thinking"), dict) else {}
    output_config = body.get("output_config") if isinstance(body.get("output_config"), dict) else {}
    return {
        "model": body.get("model"),
        "max_tokens": body.get("max_tokens"),
        "reasoning": {
            "thinking_type": thinking.get("type"),
            "effort": output_config.get("effort"),
            "budget_tokens": thinking.get("budget_tokens"),
        },
    }


def _identity_error(wire_model):
    """None when the provider's own response names the pinned model, else a code.

    Accepts a dated snapshot (`claude-opus-5-20260401`) but not a longer family name
    (`claude-opus-50`): the boundary after the pinned name must be a separator.
    """
    if not isinstance(wire_model, str) or not wire_model:
        return "ProviderIdentityUnproved"
    if wire_model == MODEL or wire_model.startswith(MODEL + "-"):
        return None
    return "ProviderIdentityMismatch"


def _endpoint_error(base_url):
    """None when `base_url` is exactly the canonical HTTPS Anthropic API, else a code.

    urlparse().hostname, compared for equality — a suffix test passes
    `api.anthropic.com.evil.test`, and plaintext http would put the credential on the
    wire in clear. Every other URL component is checked too: `https://api.anthropic.com`
    and `https://user:pw@api.anthropic.com:8443/relay?to=evil` share a hostname but are
    not the same endpoint, and this check runs with a live credential in hand.
    """
    if not isinstance(base_url, str) or not base_url:
        return "NonCanonicalEndpoint"
    try:
        parsed = urlparse(base_url)
        port = parsed.port
    except Exception:
        return "NonCanonicalEndpoint"
    if parsed.scheme != "https" or parsed.hostname != CANONICAL_HOST:
        return "NonCanonicalEndpoint"
    if port not in (None, 443) or parsed.username or parsed.password:
        return "NonCanonicalEndpoint"
    if parsed.query or parsed.fragment or parsed.params:
        return "NonCanonicalEndpoint"
    if parsed.path not in CANONICAL_PATHS:
        return "NonCanonicalEndpoint"
    return None


def _provider_error(provider):
    """None when the resolved runtime provider is exactly ours, else a code.

    Checked BEFORE the agent is constructed: `resolve_runtime_provider` may answer with
    a different provider than requested, and a non-Anthropic transport never reaches the
    instrumented seam below — the call would go out with every observed fact null.
    """
    return None if provider == PROVIDER else "NonCanonicalProvider"


def _safe_usage(usage) -> dict:
    """Allowlisted integer token counters. No strings, no bools, no nested objects."""
    counts = {}
    for field in USAGE_FIELDS:
        value = getattr(usage, field, None)
        if isinstance(value, int) and not isinstance(value, bool):
            counts[field] = value
    return counts


def _client_base_url(client) -> str:
    """The SDK client's own base_url (httpx.URL or str) — the host the credential will
    actually be sent to, rather than the config value we hoped was applied."""
    return str(getattr(client, "base_url", "") or "")


def _instrument_boundary(agent, facts: dict):
    """Shadow this agent instance's Anthropic request boundary to record wire facts.

    `_anthropic_messages_create` is the single mainline seam where the built body and
    the live SDK client meet (agent/client_lifecycle.py:1009, called from
    agent/chat_completion_helpers.py:776) and where the provider's Message is returned
    before normalisation drops `.model`. Instance-scoped: the class method is untouched,
    so nothing outside this process is affected. Returns a restore callable.
    """
    inner = agent._anthropic_messages_create

    def boundary(api_kwargs, *, client=None):
        used = client if client is not None else getattr(agent, "_anthropic_client", None)
        host = _client_base_url(used)
        # Asserted BEFORE the inner call, i.e. before the credential is transmitted.
        endpoint_error = _endpoint_error(host)
        if endpoint_error:
            raise BridgeError(endpoint_error)
        # ONE dispatch per bridge invocation. The SDK client is built with max_retries=0,
        # but retry in hermes belongs to an OUTER loop (agent/anthropic_adapter.py:361,508),
        # so "no retry" has to be enforced here or it is only a comment. Refused before the
        # second network call, and a client configured to retry is refused before the first.
        if facts.get("provider_attempts") or getattr(used, "max_retries", 0):
            raise BridgeError("ProviderRetryNotAllowed")
        # The pinned model is asserted on the body that is about to go out, not on our
        # own constant: a rewritten or missing model would bill a different model under
        # this product's Opus claim. The provider may still ANSWER with a dated snapshot.
        if (api_kwargs or {}).get("model") != MODEL:
            raise BridgeError("RequestedModelMismatch")
        facts["endpoint_host"] = urlparse(host).hostname
        facts["endpoint_path"] = "messages"
        facts.setdefault("request", _observe_request(api_kwargs))
        facts["provider_attempts"] = 1
        try:
            response = inner(api_kwargs, client=client)
        except BaseException as exc:
            # An HTTP failure the agent later swallows must still be reported as that
            # failure: without this, a 429 comes back as ProviderIdentityUnproved
            # because no wire model arrived. Status and a fixed code only, never prose.
            status = _http_status(exc)
            if status is not None:
                facts["http_status"] = status
                facts["error_code"] = "ProviderHTTPError"
            raise
        wire = getattr(response, "model", None)
        if isinstance(wire, str) and wire:
            facts["wire_model"] = wire
        stop = getattr(response, "stop_reason", None)
        if stop in STOP_REASONS:
            facts["stop_reason"] = stop
        facts["usage"] = _safe_usage(getattr(response, "usage", None))
        # Relays state the downstream that served the call; the canonical API does not
        # send this field, so absence is reported as absence (never as PROVIDER).
        upstream = getattr(response, "provider", None)
        if isinstance(upstream, str) and upstream:
            facts["provider_actual"] = upstream
        return response

    agent._anthropic_messages_create = boundary
    return lambda: agent.__dict__.pop("_anthropic_messages_create", None)


def run(prompt: str) -> dict:
    sys.path.insert(0, HERMES_AGENT)
    from hermes_cli.runtime_provider import resolve_runtime_provider
    from run_agent import AIAgent

    facts: dict = {}
    provenance = {
        "provider_requested": PROVIDER, "model_requested": MODEL,
        "api_mode_requested": "anthropic_messages", "reasoning_effort_requested": "max",
        "max_tokens_requested": MAX_TOKENS, "at": _now(),
    }

    # Provider chatter must never contaminate the single-JSON-object stdout contract.
    with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
        runtime = resolve_runtime_provider(requested=PROVIDER, target_model=MODEL)
        configured = runtime.get("base_url") or ""
        # An explicitly configured endpoint is refused here, before the agent is built.
        # An empty value means the SDK default, which the boundary verifies for real.
        if configured and _endpoint_error(configured):
            raise BridgeError("NonCanonicalEndpoint")
        provider_error = _provider_error(runtime.get("provider"))
        if provider_error:
            raise BridgeError(provider_error)
        agent = AIAgent(
            api_key=runtime.get("api_key"), base_url=runtime.get("base_url"),
            provider=runtime.get("provider"), api_mode=runtime.get("api_mode"), model=MODEL,
            max_iterations=1, max_tokens=MAX_TOKENS,
            reasoning_config={"enabled": True, "effort": "max"},
            enabled_toolsets=[], skip_context_files=True, skip_memory=True,
            skip_background_review=True, save_trajectories=False, quiet_mode=True,
            session_id="lesson-" + datetime.now(timezone.utc).strftime("%H%M%S%f"),
            run_budget_seconds=RUN_BUDGET_SECONDS,
        )
        # Synthetic system context only: never the owner's conversation, skills or memory.
        agent._cached_system_prompt = SYSTEM
        agent._persist_disabled = True
        agent.compression_enabled = False
        agent._fallback_chain = []   # a fallback model would silently forge provenance
        # Pin the NON-streaming dispatch. The streaming path opens the SSE stream inline
        # (`request_client.messages.stream(**kwargs)`, agent/chat_completion_helpers.py:3492)
        # and never calls `_anthropic_messages_create`, so the boundary hook below would be
        # dead code and every observed fact would come back null while the call still
        # succeeded — exactly the silent unprovable-provenance failure this bridge exists to
        # prevent. Non-streaming routes through chat_completion_helpers.py:776 ->
        # client_lifecycle.py:1009, the one seam where the built body and the live client
        # meet. There is no stream consumer here (one JSON object on stdout), so nothing is lost.
        agent._disable_streaming = True
        with contextlib.suppress(Exception):
            from agent.model_router_runtime import RouterConfig
            agent._model_router_config_loader = lambda: RouterConfig(mode="disabled")
        restore = _instrument_boundary(agent, facts)
        try:
            result = agent.run_conversation(prompt, conversation_history=[])
        finally:
            restore()

    text = (result.get("final_response") or "").strip()
    observed = facts.get("request") or {}
    wire = facts.get("wire_model")
    provenance.update(
        provider_configured=getattr(agent, "provider", None),
        model_configured=getattr(agent, "model", None),
        api_mode_configured=getattr(agent, "api_mode", None),
        # Observed facts: read off the wire, independent of everything above.
        endpoint_host=facts.get("endpoint_host"),
        provider_actual=facts.get("provider_actual"),
        observed_request_model=observed.get("model"),
        observed_request_max_tokens=observed.get("max_tokens"),
        observed_request_reasoning=observed.get("reasoning"),
        observed_provider_attempts=int(facts.get("provider_attempts") or 0),
        observed_endpoint_path=facts.get("endpoint_path"),
        observed_stop_reason=facts.get("stop_reason"),
        observed_usage=facts.get("usage"),
        model_wire=wire,
        model_wire_proved=_identity_error(wire) is None,
        response_chars=len(text),
        fallback_chain_len=len(getattr(agent, "_fallback_chain", []) or []),
        live=True,
    )
    # An HTTP failure captured at the boundary outranks every refusal below: the agent
    # may swallow the exception, and reporting a 429 as an unproved identity sends a
    # learner (and the operator) after the wrong cause.
    http_status = facts.get("http_status")
    if http_status is not None:
        return {"ok": False, "error": facts.get("error_code") or "ProviderHTTPError",
                "status": http_status, "provenance": provenance}
    # Refuse before success: an unproved or wrong identity invalidates the whole claim,
    # so it is an error with provenance attached, never a lesson the learner trusts.
    identity_error = _identity_error(wire)
    if identity_error:
        return {"ok": False, "error": identity_error, "status": None, "provenance": provenance}
    if result.get("failure_reason") or not text:
        return {"ok": False, "error": "ProviderFailure", "status": None, "provenance": provenance}
    return {"ok": True, "text": text, "provenance": provenance}


def main() -> int:
    # The Hermes managed-runtime launcher prepends its own argv entries, so take the
    # mode by membership instead of a fixed index.
    mode = next((a for a in sys.argv[1:] if a in ("lesson", "feedback")), "")
    if not mode:
        _emit({"ok": False, "error": "BadMode", "status": None,
               "detail": "mode must be lesson or feedback"})
        return 2
    prompt = _prompt_or_none(sys.stdin.read())
    if prompt is None:
        _emit({"ok": False, "error": "BadRequest", "status": None, "detail": BAD_REQUEST})
        return 2
    try:
        _emit(run(prompt))
        return 0
    except BaseException as exc:          # includes the parent's SIGTERM path
        payload = _failure(exc)
        payload["provenance"] = {"provider_requested": PROVIDER, "model_requested": MODEL,
                                 "model_wire": None, "model_wire_proved": False,
                                 "live": True, "at": _now()}
        _emit(payload)
        return 1


if __name__ == "__main__":
    os.environ.setdefault("HERMES_QUIET", "1")
    raise SystemExit(main())

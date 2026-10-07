import json
import sys
import types

sys.path.insert(0, "/Users/man/education-product-discovery/lesson")
import ai_bridge

# A stand-in agent exposing ONLY the real seam's signature
# (agent/client_lifecycle.py:1009 -> _anthropic_messages_create(api_kwargs, *, client=None)).
calls = []


class FakeMessage:
    model = "claude-opus-5-20260101"
    provider = None


class FakeClient:
    base_url = "https://api.anthropic.com"


class FakeAgent:
    def __init__(self):
        self._anthropic_client = FakeClient()

    def _anthropic_messages_create(self, api_kwargs, *, client=None):
        calls.append(api_kwargs)
        return FakeMessage()


agent = FakeAgent()
facts = {}
restore = ai_bridge._instrument_boundary(agent, facts)
body = {
    "model": "claude-opus-5", "max_tokens": 128000,
    "thinking": {"type": "adaptive", "display": "summarized"},
    "output_config": {"effort": "max"},
    "messages": [{"role": "user", "content": "PROMPT TEXT"}],
}
agent._anthropic_messages_create(body)
restore()

assert len(calls) == 1, "inner boundary must still be called exactly once"
assert "_anthropic_messages_create" not in agent.__dict__, "shadow not restored"
assert agent._anthropic_messages_create.__self__ is agent, "class method must be intact"
assert facts["wire_model"] == "claude-opus-5-20260101"
assert facts["endpoint_host"] == "api.anthropic.com"
assert facts["request"]["reasoning"] == {
    "thinking_type": "adaptive", "effort": "max", "budget_tokens": None,
}
assert "PROMPT" not in json.dumps(facts), "facts leaked prompt text"
print("captured:", json.dumps(facts, sort_keys=True))

# A non-canonical client must be refused BEFORE the inner call runs.
for bad in ("https://openrouter.ai/api/v1", "https://api.anthropic.com.evil.test"):
    agent2 = FakeAgent()
    agent2._anthropic_client = types.SimpleNamespace(base_url=bad)
    before = len(calls)
    r2 = ai_bridge._instrument_boundary(agent2, {})
    try:
        agent2._anthropic_messages_create(body)
        raise SystemExit("FAIL: %s was not refused" % bad)
    except ai_bridge.BridgeError as exc:
        assert str(exc) == "NonCanonicalEndpoint"
        assert len(calls) == before, "credential-bearing call ran before the host check"
    finally:
        r2()
    print("refused before send:", bad)

print("OFFLINE BOUNDARY CHECK OK")

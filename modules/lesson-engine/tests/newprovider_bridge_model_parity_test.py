#!/usr/bin/env python3
"""RED-before-GREEN: the bridge must request the SAME model lesson/server.mjs asks for.

server.mjs pins `const MODEL = 'claude-opus-5'` and reports provenance to the learner.
A bridge hardcoding a different model generates the lesson with a model nobody asked
for while provenance keeps printing the configured name. Additive: touches no existing test.
"""
import pathlib
import re

LESSON = pathlib.Path(__file__).resolve().parent.parent
BRIDGE = LESSON / "ai_bridge.py"
SERVER = LESSON / "server.mjs"


def _server_model() -> str:
    m = re.search(r"const\s+MODEL\s*=\s*'([^']+)'", SERVER.read_text(encoding="utf-8"))
    assert m, "server.mjs no longer pins a literal MODEL"
    return m.group(1)


def _bridge_model() -> str:
    m = re.search(r"^MODEL\s*=\s*\"([^\"]+)\"", BRIDGE.read_text(encoding="utf-8"), re.M)
    assert m, "ai_bridge.py no longer defines a module-level MODEL"
    return m.group(1)


def test_bridge_requests_the_server_pinned_model():
    assert _bridge_model() == _server_model(), (
        "bridge/server model mismatch: bridge asks %r, server pins %r"
        % (_bridge_model(), _server_model())
    )


def test_bridge_still_proves_wire_identity_rather_than_asserting_it():
    src = BRIDGE.read_text(encoding="utf-8")
    assert "model_wire_proved" in src, "provenance must keep the proved/unproved distinction"
    assert "_fallback_chain = []" in src, "a fallback model would silently forge provenance"


if __name__ == "__main__":
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print("PASS", name)
            except AssertionError as exc:
                print("FAIL", name, "->", exc)

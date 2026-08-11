from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from mcp_router import EVIDENCE_STATE, Router, Tool, demo_router


def test_demo_router_executes_only_explicitly_allowed_tools() -> None:
    router = demo_router()
    assert router.call("ping") == {
        "ok": True,
        "result": "pong",
        "evidence_state": EVIDENCE_STATE,
    }
    assert router.call("add", a=2, b=40)["result"] == 42
    assert router.call("evil") == {
        "ok": False,
        "error": "denied_or_missing",
        "evidence_state": EVIDENCE_STATE,
    }


def test_registration_does_not_implicitly_grant_execution() -> None:
    router = Router()
    router.register(Tool("registered", lambda: "value"))
    assert router.call("registered")["error"] == "denied_or_missing"
    router.allow_tool("registered")
    assert router.call("registered")["result"] == "value"
    router.deny_tool("registered")
    assert router.call("registered")["error"] == "denied_or_missing"


def test_mutating_tool_requires_separate_authorization() -> None:
    state: list[str] = []
    router = Router()
    router.register(
        Tool("mutate", lambda value: state.append(value), read_only=False),
        allowed=True,
    )
    assert router.call("mutate", value="x")["error"] == "mutating_tool_denied"
    assert state == []

    router.allow_tool("mutate", allow_mutating=True)
    assert router.call("mutate", value="x")["ok"] is True
    assert state == ["x"]


def test_duplicate_and_invalid_registration_fail_closed() -> None:
    router = Router()
    router.register(Tool("ping", lambda: "pong"))
    with pytest.raises(ValueError, match="duplicate tool registration"):
        router.register(Tool("ping", lambda: "again"))
    with pytest.raises(ValueError, match="tool name"):
        Tool("", lambda: None)
    with pytest.raises(KeyError):
        router.allow_tool("missing")


def test_handler_errors_do_not_leak_exception_text() -> None:
    router = Router()

    def fail() -> None:
        raise RuntimeError("private-provider-secret-or-record")

    router.register(Tool("fail", fail), allowed=True)
    result = router.call("fail")
    assert result["ok"] is False
    assert result["error"] == "handler_error"
    assert "private-provider-secret-or-record" not in str(result)

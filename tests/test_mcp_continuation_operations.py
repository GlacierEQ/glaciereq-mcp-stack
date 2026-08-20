from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from anti_neutralization_gate import evaluate_merge_gate
from mcp_router import Router, Tool


def test_router_plan_distinguishes_unregistered_unallowlisted_and_mutation_states() -> None:
    router = Router()
    assert router.plan("missing")["code"] == "TOOL_UNREGISTERED"

    router.register(Tool("read", lambda: "value"))
    assert router.plan("read")["code"] == "TOOL_ALLOWLIST_BINDING_REQUIRED"

    router.register(Tool("mutate", lambda: None, read_only=False), allowed=True)
    mutation = router.plan("mutate")
    assert mutation["code"] == "MUTATION_AUTHORIZATION_REQUIRED"
    assert mutation["external_action_authorized"] is False


def test_router_inspection_is_non_executing_and_reports_dispatch_readiness() -> None:
    calls: list[str] = []
    router = Router()
    router.register(Tool("probe", lambda: calls.append("called")), allowed=True)

    state = router.inspect("probe")

    assert calls == []
    assert state["tools"] == [
        {
            "name": "probe",
            "registered": True,
            "read_only": True,
            "allowlisted": True,
            "mutation_authorized": True,
            "dispatch_ready": True,
        }
    ]


def test_handler_failure_is_redacted_and_has_recovery_plan() -> None:
    router = Router()

    def fail() -> None:
        raise RuntimeError("provider-secret")

    router.register(Tool("fail", fail), allowed=True)
    result = router.call("fail")

    assert result["error"] == "handler_error"
    assert result["continuation"]["code"] == "HANDLER_DEGRADED"
    assert "provider-secret" not in str(result)


def test_non_passing_merge_assessment_carries_non_authorizing_recovery_plan(tmp_path: Path) -> None:
    decision = evaluate_merge_gate(tmp_path)

    assert decision.ok is False
    assert decision.code == "PACKAGE_SURFACE_AMPUTATED"
    assert decision.continuation is not None
    assert decision.continuation["status"] == "continuation_required"
    assert decision.continuation["external_action_authorized"] is False

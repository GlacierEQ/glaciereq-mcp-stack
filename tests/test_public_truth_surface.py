from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_json(path: str) -> dict:
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def test_public_surface_is_bounded_to_local_dispatch() -> None:
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    router = (ROOT / "src" / "mcp_router.py").read_text(encoding="utf-8")
    assert "LOCAL_ALLOWLIST_ROUTER_NOT_EXTERNAL_MCP_DEPLOYMENT" in readme
    assert "LOCAL_ALLOWLIST_ROUTER_NOT_EXTERNAL_MCP_DEPLOYMENT" in router
    assert "does **not** establish a deployed Model Context Protocol server" in readme


def test_machine_capability_matches_repository_native_proof() -> None:
    capabilities = load_json("machine/capabilities.json")
    contract = load_json("machine/target-contract.json")
    state = load_json("machine/excellence-state.json")
    assert capabilities["capabilities"] == ["policy-gated-local-tool-dispatch"]
    assert contract["verified_capability"] == "policy-gated-local-tool-dispatch"
    assert state["verified_capability"] == "policy-gated-local-tool-dispatch"
    assert contract["current"]["deployed"] is False
    assert state["principal_state"] == "TESTED"


def test_generic_migration_placeholders_cannot_reenter_public_state() -> None:
    paths = [
        "machine/capabilities.json",
        "machine/target-contract.json",
        "machine/excellence-state.json",
    ]
    combined = "\n".join((ROOT / path).read_text(encoding="utf-8") for path in paths)
    assert "HYPER_VALIDATED" not in combined
    assert "hyper-scaling" not in combined

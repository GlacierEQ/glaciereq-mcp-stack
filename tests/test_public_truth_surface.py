from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_json(path: str) -> dict:
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def test_verified_plane_local_router_token() -> None:
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    router = (ROOT / "src" / "mcp_router.py").read_text(encoding="utf-8")
    assert "LOCAL_ALLOWLIST_ROUTER_NOT_EXTERNAL_MCP_DEPLOYMENT" in readme
    assert "LOCAL_ALLOWLIST_ROUTER_NOT_EXTERNAL_MCP_DEPLOYMENT" in router
    assert "does **not** claim a production multi-tenant MCP cloud" in readme or "not a GlacierEQ-wide agent mesh" in readme


def test_implemented_plane_packages_restored() -> None:
    """Counter-engineering: packages must exist; do not re-amputate for truth."""
    required = [
        "packages/github-mcp/src/index.ts",
        "packages/asana-mcp/src/index.ts",
        "packages/confluence-mcp/src/index.ts",
        "packages/supabase-mcp/src/index.ts",
        "packages/neo4j-mcp/src/index.ts",
        "packages/shared/src/index.ts",
        "mcp.json",
        "package.json",
    ]
    for rel in required:
        assert (ROOT / rel).is_file(), f"missing restored surface: {rel}"
    pkg = load_json("package.json")
    assert "workspaces" in pkg
    mcp = load_json("mcp.json")
    assert "mcpServers" in mcp
    assert "github-mcp" in mcp["mcpServers"]


def test_machine_capability_dual_plane() -> None:
    capabilities = load_json("machine/capabilities.json")
    contract = load_json("machine/target-contract.json")
    state = load_json("machine/excellence-state.json")
    manifest = load_json("manifests/glaciereq-mcp-stack.apex.repo.json")
    assert "policy-gated-local-tool-dispatch" in capabilities["capabilities"]
    assert "credentialed-stdio-mcp-server-packages" in capabilities["capabilities"]
    assert contract["verified_capability"] == "policy-gated-local-tool-dispatch"
    assert contract.get("implemented_capability") == "credentialed-stdio-mcp-server-packages"
    assert state["verified_capability"] == "policy-gated-local-tool-dispatch"
    assert state.get("implemented_capability") == "credentialed-stdio-mcp-server-packages"
    assert contract["current"]["deployed"] is False
    assert state["principal_state"] == "TESTED"
    assert "HYPER_VALIDATED" not in json.dumps(state, sort_keys=True)
    assert manifest["verified_capability"] == "policy-gated-local-tool-dispatch"
    assert "MCP_PACKAGES_RESTORED" in manifest.get("implemented_evidence_state", "")


def test_generic_migration_placeholders_cannot_reenter_positive_capability_state() -> None:
    capabilities = load_json("machine/capabilities.json")["capabilities"]
    state = load_json("machine/excellence-state.json")
    assert "hyper-scaling" not in capabilities
    assert "HYPER_VALIDATED" not in json.dumps(state, sort_keys=True)

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from anti_neutralization_gate import (  # noqa: E402
    OPERATOR_AUTHORIZED_REDUCTION,
    evaluate_merge_gate,
    write_proof_receipt,
)
from mcp_package_surface import inventory_packages, refuse_if_amputated  # noqa: E402


def test_inventory_complete_on_main_tree() -> None:
    inv = inventory_packages(ROOT)
    assert inv.complete, inv.missing
    assert inv.workspaces_ok
    assert "github-mcp" in inv.mcp_servers
    assert all(p.present for p in inv.packages)


def test_refuse_if_amputated_ok() -> None:
    ok, err = refuse_if_amputated(ROOT)
    assert ok is True
    assert err is None


def test_gate_passes_intact_surface() -> None:
    decision = evaluate_merge_gate(ROOT)
    assert decision.ok is True
    assert decision.code == "PASS"
    assert decision.evidence["package_surface"]["complete"] is True


def test_gate_refuses_package_amputation(tmp_path: Path) -> None:
    # Minimal amputated tree: no packages
    (tmp_path / "machine").mkdir()
    (tmp_path / "machine" / "capabilities.json").write_text(
        json.dumps(
            {
                "capabilities": ["policy-gated-local-tool-dispatch"],
                "planes": {
                    "verified": ["policy-gated-local-tool-dispatch"],
                    "implemented": [],
                },
                "evidence_token_implemented": "MCP_PACKAGES_RESTORED_CREDENTIAL_GATED_NOT_ESTATE_MESH",
                "evidence_token_verified": "LOCAL_ALLOWLIST_ROUTER_NOT_EXTERNAL_MCP_DEPLOYMENT",
            }
        ),
        encoding="utf-8",
    )
    decision = evaluate_merge_gate(tmp_path)
    assert decision.ok is False
    assert decision.code == "PACKAGE_SURFACE_AMPUTATED"


def test_gate_refuses_unauthorized_capability_reduction() -> None:
    decision = evaluate_merge_gate(
        ROOT,
        proposed_capabilities=["policy-gated-local-tool-dispatch"],
    )
    assert decision.ok is False
    assert decision.code == "UNAUTHORIZED_CAPABILITY_REDUCTION"
    assert "credentialed-stdio-mcp-server-packages" in decision.detail


def test_gate_allows_authorized_reduction_with_reason() -> None:
    decision = evaluate_merge_gate(
        ROOT,
        proposed_capabilities=["policy-gated-local-tool-dispatch"],
        reduction_token=OPERATOR_AUTHORIZED_REDUCTION,
        reduction_reason="Operator temporary shrink for isolated router audit only",
    )
    assert decision.ok is True
    assert decision.evidence.get("reduction_authorized") is True


def test_proof_receipt_writes() -> None:
    decision = evaluate_merge_gate(ROOT)
    path = write_proof_receipt(decision, root=ROOT)
    assert path.is_file()
    payload = json.loads(path.read_text(encoding="utf-8"))
    assert payload["mechanism_id"] == "anti_neutralization_gate"
    assert payload["companion_mechanism_id"] == "mcp_package_restore"
    assert payload["decision"]["ok"] is True

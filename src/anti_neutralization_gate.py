"""Anti-Neutralization Merge Gate — refuse capability amputation.

CI / promotion paths call this before claiming green or shrinking planes.
Shrink is allowed only with OPERATOR_AUTHORIZED_REDUCTION + explicit reason.

Mechanism: anti_neutralization_gate (Genius invent primary).
Composes with mcp_package_surface (provider restore) under dual-plane truth.
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from mcp_package_surface import (
    IMPLEMENTED_TOKEN,
    inventory_packages,
    refuse_if_amputated,
)

OPERATOR_AUTHORIZED_REDUCTION = "OPERATOR_AUTHORIZED_REDUCTION"

# Capabilities that must not vanish without explicit operator reduction
PROTECTED_CAPABILITIES: frozenset[str] = frozenset(
    {
        "policy-gated-local-tool-dispatch",
        "credentialed-stdio-mcp-server-packages",
    }
)


@dataclass(frozen=True)
class GateDecision:
    ok: bool
    code: str
    detail: str
    evidence: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return {
            "ok": self.ok,
            "code": self.code,
            "detail": self.detail,
            "evidence": self.evidence,
        }


def repository_root() -> Path:
    return Path(__file__).resolve().parents[1]


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def evaluate_merge_gate(
    root: Path | None = None,
    *,
    proposed_capabilities: list[str] | None = None,
    reduction_token: str | None = None,
    reduction_reason: str | None = None,
) -> GateDecision:
    """Evaluate whether HEAD may proceed without neutralizing product power.

    Fail closed on:
      - missing restored MCP package surface
      - dropping protected capabilities without OPERATOR_AUTHORIZED_REDUCTION
      - dual-plane tokens missing from machine capabilities
    """
    base = root or repository_root()
    evidence: dict[str, Any] = {"repository": "GlacierEQ/glaciereq-mcp-stack"}

    ok_surface, surface_err = refuse_if_amputated(base)
    inv = inventory_packages(base)
    evidence["package_surface"] = inv.to_dict()
    if not ok_surface:
        return GateDecision(
            ok=False,
            code="PACKAGE_SURFACE_AMPUTATED",
            detail=surface_err or "provider surface incomplete",
            evidence=evidence,
        )

    caps_path = base / "machine" / "capabilities.json"
    if not caps_path.is_file():
        return GateDecision(
            ok=False,
            code="CAPABILITIES_MISSING",
            detail="machine/capabilities.json required",
            evidence=evidence,
        )
    caps_doc = _load_json(caps_path)
    current = set(caps_doc.get("capabilities") or [])
    evidence["current_capabilities"] = sorted(current)
    evidence["implemented_token"] = caps_doc.get("evidence_token_implemented")
    evidence["verified_token"] = caps_doc.get("evidence_token_verified")

    if caps_doc.get("evidence_token_implemented") != IMPLEMENTED_TOKEN:
        return GateDecision(
            ok=False,
            code="IMPLEMENTED_TOKEN_DRIFT",
            detail="evidence_token_implemented must remain MCP_PACKAGES_RESTORED…",
            evidence=evidence,
        )

    proposed = set(proposed_capabilities) if proposed_capabilities is not None else current
    removed = PROTECTED_CAPABILITIES - proposed
    evidence["proposed_capabilities"] = sorted(proposed)
    evidence["removed_protected"] = sorted(removed)

    if removed:
        authorized = reduction_token == OPERATOR_AUTHORIZED_REDUCTION
        if not authorized or not (reduction_reason or "").strip():
            return GateDecision(
                ok=False,
                code="UNAUTHORIZED_CAPABILITY_REDUCTION",
                detail=(
                    "Protected capabilities removed without "
                    f"{OPERATOR_AUTHORIZED_REDUCTION} + reason: {sorted(removed)}"
                ),
                evidence=evidence,
            )
        evidence["reduction_authorized"] = True
        evidence["reduction_reason"] = reduction_reason

    # Require dual-plane notes honesty
    planes = caps_doc.get("planes") or {}
    if "credentialed-stdio-mcp-server-packages" not in (planes.get("implemented") or []):
        return GateDecision(
            ok=False,
            code="PLANE_IMPLEMENTED_MISSING",
            detail="planes.implemented must list credentialed-stdio-mcp-server-packages",
            evidence=evidence,
        )

    evidence["gate"] = "PASS"
    return GateDecision(
        ok=True,
        code="PASS",
        detail="Surface intact; dual-plane tokens honest; no unauthorized reduction",
        evidence=evidence,
    )


def write_proof_receipt(
    decision: GateDecision,
    *,
    root: Path | None = None,
    path: Path | None = None,
) -> Path:
    """Emit receipt for exact-head / CI binding."""
    base = root or repository_root()
    out = path or (base / "receipts" / "anti_neutralization_gate_proof.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "schema": "glaciereq.mcp-stack.anti-neutralization-receipt.v1",
        "mechanism_id": "anti_neutralization_gate",
        "companion_mechanism_id": "mcp_package_restore",
        "decision": decision.to_dict(),
        "capabilities_sha256": _sha256_file(base / "machine" / "capabilities.json")
        if (base / "machine" / "capabilities.json").is_file()
        else None,
        "mcp_json_sha256": _sha256_file(base / "mcp.json")
        if (base / "mcp.json").is_file()
        else None,
    }
    out.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return out


def main() -> int:
    decision = evaluate_merge_gate()
    path = write_proof_receipt(decision)
    print(json.dumps({"decision": decision.to_dict(), "receipt": str(path)}, indent=2))
    return 0 if decision.ok else 1


if __name__ == "__main__":
    raise SystemExit(main())

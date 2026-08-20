"""Structured, non-executing continuation plans for MCP capability recovery.

The local router remains explicit-allowlist and host-embedded. This module adds
an actionable path for incomplete capability state without calling providers,
creating credentials, or widening mutation authority.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Sequence


SCHEMA = "glaciereq.mcp.continuation.v1"
EVIDENCE_STATE = "LOCAL_ALLOWLIST_ROUTER_NOT_EXTERNAL_MCP_DEPLOYMENT"


@dataclass(frozen=True)
class Continuation:
    code: str
    detail: str
    next_actions: tuple[str, ...]
    external_action_authorized: bool = False

    def to_dict(self) -> dict[str, Any]:
        return {
            "schema": SCHEMA,
            "status": "continuation_required",
            "code": self.code,
            "detail": self.detail,
            "next_actions": list(self.next_actions),
            "local_recovery_authorized": True,
            "external_action_authorized": self.external_action_authorized,
            "evidence_state": EVIDENCE_STATE,
        }


def router_continuation(
    *,
    name: str,
    registered: bool,
    read_only: bool | None = None,
    handler_failed: bool = False,
) -> Continuation:
    """Create a read-only recovery plan for a local router outcome."""
    safe_name = name.strip() or "requested_tool"
    if handler_failed:
        return Continuation(
            "HANDLER_DEGRADED",
            f"{safe_name} is registered and allowed, but its local handler did not complete.",
            ("inspect_redacted_handler_health", "repair_host_binding", "retry_read_only_operation"),
        )
    if not registered:
        return Continuation(
            "TOOL_UNREGISTERED",
            f"{safe_name} is not registered in this local router.",
            ("inspect_capability_catalog", "register_host_adapter", "declare_operation_schema"),
        )
    if read_only is False:
        return Continuation(
            "MUTATION_AUTHORIZATION_REQUIRED",
            f"{safe_name} is registered but mutation authority is incomplete.",
            (
                "identify_exact_target",
                "obtain_explicit_operator_confirmation",
                "bind_idempotency_and_verification_contract",
                "grant_mutation_authorization",
            ),
        )
    return Continuation(
        "TOOL_ALLOWLIST_BINDING_REQUIRED",
        f"{safe_name} is registered but not present in the active allowlist.",
        ("review_declared_operation", "bind_explicit_allowlist_entry", "dispatch_governed_read"),
    )


def package_surface_continuation(missing: Sequence[str]) -> Continuation:
    """Return a source-only provider-surface restoration plan."""
    missing_text = ", ".join(sorted(set(missing))) or "provider surface"
    return Continuation(
        "PACKAGE_SURFACE_RECOVERY_REQUIRED",
        f"The declared MCP package surface is incomplete: {missing_text}.",
        (
            "inspect_missing_package_contract",
            "restore_source_or_workspace_metadata",
            "reinventory_package_surface",
            "bind_host_adapter_before_dispatch",
        ),
    )


def gate_continuation(code: str, detail: str) -> Continuation:
    """Map a non-passing merge assessment to explicit local recovery work."""
    mapping: Mapping[str, tuple[str, ...]] = {
        "PACKAGE_SURFACE_AMPUTATED": (
            "restore_declared_provider_surface",
            "reinventory_package_surface",
            "rerun_merge_assessment",
        ),
        "CAPABILITIES_MISSING": (
            "restore_machine_capability_document",
            "reconcile_dual_plane_metadata",
            "rerun_merge_assessment",
        ),
        "IMPLEMENTED_TOKEN_DRIFT": (
            "reconcile_implemented_evidence_token",
            "preserve_truthful_plane_labels",
            "rerun_merge_assessment",
        ),
        "UNAUTHORIZED_CAPABILITY_REDUCTION": (
            "restore_protected_capability",
            "or_record_explicit_operator_reduction_with_reason",
            "rerun_merge_assessment",
        ),
        "PLANE_IMPLEMENTED_MISSING": (
            "restore_implemented_plane_declaration",
            "reconcile_capability_catalog",
            "rerun_merge_assessment",
        ),
    }
    return Continuation(code, detail, mapping.get(code, ("inspect_gate_evidence", "repair_declared_contract", "rerun_merge_assessment")))

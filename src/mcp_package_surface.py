"""MCP provider surface inventory — credential-gated stdio packages.

Plane: IMPLEMENTED when packages exist as source; VERIFIED only for local
allowlist router (see mcp_router.EVIDENCE_STATE). Never claim deployed mesh.

Mechanism: mcp_package_restore (Genius Engine impact land #1).
Grounded in Model Context Protocol primary docs (Library of Links top shelf).
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

# Dual-plane evidence tokens (honest labels)
IMPLEMENTED_TOKEN = "MCP_PACKAGES_RESTORED_CREDENTIAL_GATED_NOT_ESTATE_MESH"
VERIFIED_TOKEN = "LOCAL_ALLOWLIST_ROUTER_NOT_EXTERNAL_MCP_DEPLOYMENT"

REQUIRED_PACKAGES: tuple[str, ...] = (
    "github-mcp",
    "asana-mcp",
    "confluence-mcp",
    "supabase-mcp",
    "neo4j-mcp",
    "shared",
)

REQUIRED_PATHS: tuple[str, ...] = (
    "packages/github-mcp/src/index.ts",
    "packages/asana-mcp/src/index.ts",
    "packages/confluence-mcp/src/index.ts",
    "packages/supabase-mcp/src/index.ts",
    "packages/neo4j-mcp/src/index.ts",
    "packages/shared/src/index.ts",
    "mcp.json",
    "package.json",
)


@dataclass(frozen=True)
class PackageSurface:
    name: str
    source_path: str
    present: bool
    has_mcp_server_marker: bool
    line_count: int


@dataclass(frozen=True)
class SurfaceInventory:
    packages: tuple[PackageSurface, ...]
    mcp_servers: tuple[str, ...]
    workspaces_ok: bool
    implemented_token: str
    verified_token: str
    complete: bool
    missing: tuple[str, ...]

    def to_dict(self) -> dict[str, Any]:
        return {
            "packages": [
                {
                    "name": p.name,
                    "source_path": p.source_path,
                    "present": p.present,
                    "has_mcp_server_marker": p.has_mcp_server_marker,
                    "line_count": p.line_count,
                }
                for p in self.packages
            ],
            "mcp_servers": list(self.mcp_servers),
            "workspaces_ok": self.workspaces_ok,
            "implemented_token": self.implemented_token,
            "verified_token": self.verified_token,
            "complete": self.complete,
            "missing": list(self.missing),
            "plane": {
                "verified": "policy-gated-local-tool-dispatch",
                "implemented": "credentialed-stdio-mcp-server-packages",
                "target": "credential-gated-stdio-and-optional-mesh-with-proof",
            },
        }


def repository_root() -> Path:
    return Path(__file__).resolve().parents[1]


def inventory_packages(root: Path | None = None) -> SurfaceInventory:
    """Inventory restored credential-gated MCP package surface."""
    base = root or repository_root()
    packages: list[PackageSurface] = []
    missing: list[str] = []

    for name in REQUIRED_PACKAGES:
        rel = f"packages/{name}/src/index.ts"
        path = base / rel
        present = path.is_file()
        marker = False
        lines = 0
        if present:
            text = path.read_text(encoding="utf-8")
            lines = len(text.splitlines())
            marker = "McpServer" in text or "mcp" in text.lower()
        else:
            missing.append(rel)
        packages.append(
            PackageSurface(
                name=name,
                source_path=rel,
                present=present,
                has_mcp_server_marker=marker,
                line_count=lines,
            )
        )

    for rel in REQUIRED_PATHS:
        if not (base / rel).is_file() and rel not in missing:
            missing.append(rel)

    mcp_servers: list[str] = []
    workspaces_ok = False
    mcp_path = base / "mcp.json"
    pkg_path = base / "package.json"
    if mcp_path.is_file():
        try:
            mcp = json.loads(mcp_path.read_text(encoding="utf-8"))
            servers = mcp.get("mcpServers") or {}
            if isinstance(servers, dict):
                mcp_servers = sorted(servers.keys())
        except json.JSONDecodeError:
            missing.append("mcp.json:invalid")
    if pkg_path.is_file():
        try:
            pkg = json.loads(pkg_path.read_text(encoding="utf-8"))
            workspaces_ok = bool(pkg.get("workspaces"))
        except json.JSONDecodeError:
            missing.append("package.json:invalid")

    # shared is a thin re-export; providers must be real MCP server sources
    provider_ok = all(
        (
            p.present
            and (
                (p.name == "shared" and p.line_count >= 1)
                or (p.has_mcp_server_marker and p.line_count > 50)
            )
        )
        for p in packages
    )
    complete = provider_ok and not missing and workspaces_ok and len(mcp_servers) >= 4

    return SurfaceInventory(
        packages=tuple(packages),
        mcp_servers=tuple(mcp_servers),
        workspaces_ok=workspaces_ok,
        implemented_token=IMPLEMENTED_TOKEN,
        verified_token=VERIFIED_TOKEN,
        complete=complete,
        missing=tuple(missing),
    )


def refuse_if_amputated(root: Path | None = None) -> tuple[bool, str | None]:
    """Fail closed if provider surface was deleted to green a smaller harness."""
    inv = inventory_packages(root)
    if inv.complete:
        return True, None
    return False, f"provider_surface_incomplete:{','.join(inv.missing) or 'packages'}"

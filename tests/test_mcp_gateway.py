from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_typescript_gateway_is_labeled_as_reference_source() -> None:
    source = (ROOT / "src" / "mcp_gateway.ts").read_text(encoding="utf-8")
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    assert "export class SovereignMCPGateway" in source
    assert "initialize" in source
    assert "TypeScript gateway is preserved as reference source" in readme
    assert "not promoted as protocol-complete" in readme

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_stdio_package_sources_mention_mcp_server() -> None:
    for name in ("github-mcp", "asana-mcp", "confluence-mcp", "supabase-mcp", "neo4j-mcp"):
        src = (ROOT / "packages" / name / "src" / "index.ts").read_text(encoding="utf-8")
        assert "McpServer" in src or "mcp" in src.lower()
        assert len(src.splitlines()) > 50

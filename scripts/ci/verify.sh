#!/usr/bin/env bash
set -euo pipefail

python -m compileall -q src tests mastermind_sidecar.py
python -m pytest -q tests

grep -q 'LOCAL_ALLOWLIST_ROUTER_NOT_EXTERNAL_MCP_DEPLOYMENT' README.md
grep -q 'LOCAL_ALLOWLIST_ROUTER_NOT_EXTERNAL_MCP_DEPLOYMENT' src/mcp_router.py
grep -q 'not promoted as protocol-complete' README.md
! grep -q 'ANSWER = 42' src/mcp_router.py
! grep -q 'answer": ANSWER' src/mcp_router.py
! grep -q 'hyper-scaling' machine/capabilities.json
! grep -q 'HYPER_VALIDATED' machine/excellence-state.json

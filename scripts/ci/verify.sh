#!/usr/bin/env bash
set -euo pipefail

python -m pip install --disable-pip-version-check --quiet pytest
python -m compileall -q src tests scripts mastermind_sidecar.py
python -m pytest -q tests
python scripts/operate.py

grep -q 'LOCAL_ALLOWLIST_ROUTER_NOT_EXTERNAL_MCP_DEPLOYMENT' README.md
grep -q 'LOCAL_ALLOWLIST_ROUTER_NOT_EXTERNAL_MCP_DEPLOYMENT' src/mcp_router.py
grep -q 'not promoted as protocol-complete' README.md

if grep -Fq -- 'ANSWER = 42' src/mcp_router.py; then
  exit 1
fi
if grep -Fq -- 'answer": ANSWER' src/mcp_router.py; then
  exit 1
fi
if grep -Fq -- 'hyper-scaling' machine/capabilities.json; then
  exit 1
fi
if grep -Fq -- 'HYPER_VALIDATED' machine/excellence-state.json; then
  exit 1
fi

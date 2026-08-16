#!/usr/bin/env bash
set -euo pipefail

python3 -m pip install --disable-pip-version-check --quiet pytest || \
  python3 -m pip install --disable-pip-version-check --quiet --break-system-packages pytest
python3 -m compileall -q src tests scripts mastermind_sidecar.py
python3 -m pytest -q tests
python3 scripts/operate.py

grep -q 'LOCAL_ALLOWLIST_ROUTER_NOT_EXTERNAL_MCP_DEPLOYMENT' README.md
grep -q 'LOCAL_ALLOWLIST_ROUTER_NOT_EXTERNAL_MCP_DEPLOYMENT' src/mcp_router.py
grep -q 'credentialed-stdio-mcp-server-packages' machine/capabilities.json
test -f packages/github-mcp/src/index.ts
test -f packages/asana-mcp/src/index.ts
test -f mcp.json

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

echo "verify dual-plane OK"

# GlacierEQ Sovereign MCP Stack — Stdio JSON-RPC 2.0 Gateway 🌌

> **Sovereign Model Context Protocol (MCP) gateway implementing stdio JSON-RPC 2.0 tool routing and PostgreSQL persistence.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6)]()
[![SQL](https://img.shields.io/badge/SQL-PostgreSQL-blue)]()
[![Python](https://img.shields.io/badge/Python-3.9+-blue)]()
[![Domain](https://img.shields.io/badge/Domain-MCP%20Protocol-purple)]()

---

## 🎯 For Recruiters & Hiring Managers

This repository implements the **GlacierEQ Sovereign MCP Stack** — providing standard Model Context Protocol gateways for AI agents to call tools and read resources. It demonstrates:

- **JSON-RPC 2.0 stdio router** handling request initialization, tool listing, and tool calls
- **TypeScript strict typing** for protocol message schemas and parameter validation
- **SQL backend storage** for persistent MCP server registration and session audit logs
- **Inter-process isolation** preventing tool execution crashes from downing the gateway

**Why this matters**: The Model Context Protocol (MCP) is becoming the universal standard connecting LLMs to tools, databases, and APIs.

---

## 🔬 For Engineers & Technical Reviewers

### Core Components

| Component | Language | Purpose |
|---|---|---|
| `src/mcp_gateway.ts` | TypeScript | Stdio JSON-RPC 2.0 server & router |
| `src/mcp_registry.sql` | SQL | PostgreSQL schema for MCP servers and tools |
| `src/mcp_stack.py` | Python | Gateway process launcher and supervisor |
| `tests/` | Python | Protocol compliance test harness |

---

## 🤖 ML/AI & Programmatic Mesh Integration

- **MCP Tool**: Native host for all GlacierEQ swarm tools
- **Mastermind Sidecar**: Direct status publishing to APEX Highway mesh
- **SHA-256 Integrity**: Tracked in `.integrity/file_hashes.json`

---

## ⚡ Quick Start

```bash
python3 src/mcp_stack.py
python3 tests/test_mcp_gateway.py
```

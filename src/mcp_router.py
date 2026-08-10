#!/usr/bin/env python3
"""Repository-local tool router with explicit allow and mutation policy.

This module is not a network MCP server and does not connect to external tools,
providers, databases, or sibling repositories. It demonstrates bounded in-process
registration and dispatch semantics that can be embedded by a separately verified
host.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable

EVIDENCE_STATE = "LOCAL_ALLOWLIST_ROUTER_NOT_EXTERNAL_MCP_DEPLOYMENT"


@dataclass(frozen=True)
class Tool:
    name: str
    handler: Callable[..., Any]
    read_only: bool = True

    def __post_init__(self) -> None:
        if not self.name.strip():
            raise ValueError("tool name must not be empty")
        if not callable(self.handler):
            raise TypeError("tool handler must be callable")


@dataclass
class Router:
    tools: dict[str, Tool] = field(default_factory=dict)
    allow: set[str] = field(default_factory=set)
    allow_mutating: set[str] = field(default_factory=set)

    def register(
        self,
        tool: Tool,
        *,
        allowed: bool = False,
        mutating_allowed: bool = False,
    ) -> None:
        """Register a tool without implicitly granting execution authority."""

        if tool.name in self.tools:
            raise ValueError(f"duplicate tool registration: {tool.name}")
        if mutating_allowed and tool.read_only:
            raise ValueError("read-only tools do not need mutating authorization")
        self.tools[tool.name] = tool
        if allowed:
            self.allow.add(tool.name)
        if mutating_allowed:
            self.allow_mutating.add(tool.name)

    def allow_tool(self, name: str, *, allow_mutating: bool = False) -> None:
        tool = self.tools.get(name)
        if tool is None:
            raise KeyError(name)
        if allow_mutating and tool.read_only:
            raise ValueError("read-only tools do not need mutating authorization")
        self.allow.add(name)
        if allow_mutating:
            self.allow_mutating.add(name)

    def deny_tool(self, name: str) -> None:
        self.allow.discard(name)
        self.allow_mutating.discard(name)

    def call(self, name: str, **kwargs: Any) -> dict[str, Any]:
        tool = self.tools.get(name)
        if tool is None or name not in self.allow:
            return {
                "ok": False,
                "error": "denied_or_missing",
                "evidence_state": EVIDENCE_STATE,
            }
        if not tool.read_only and name not in self.allow_mutating:
            return {
                "ok": False,
                "error": "mutating_tool_denied",
                "evidence_state": EVIDENCE_STATE,
            }
        try:
            result = tool.handler(**kwargs)
        except Exception:
            return {
                "ok": False,
                "error": "handler_error",
                "evidence_state": EVIDENCE_STATE,
            }
        return {
            "ok": True,
            "result": result,
            "evidence_state": EVIDENCE_STATE,
        }


def demo_router() -> Router:
    router = Router()
    router.register(Tool("ping", lambda: "pong"), allowed=True)
    router.register(Tool("add", lambda a, b: a + b), allowed=True)
    return router


if __name__ == "__main__":
    router = demo_router()
    print(router.call("ping"))
    print(router.call("add", a=2, b=40))
    print(router.call("rm"))

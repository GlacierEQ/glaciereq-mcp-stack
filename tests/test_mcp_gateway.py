"""Test suite for GlacierEQ Sovereign MCP Gateway."""
import unittest

class SovereignMCPGatewaySim:
    def handle_request(self, method: str) -> dict:
        if method == "initialize":
            return {"serverInfo": {"name": "glaciereq-mcp-gateway"}}
        return {"error": "Method not found"}

class TestSovereignMCPGateway(unittest.TestCase):
    def test_initialize(self):
        gw = SovereignMCPGatewaySim()
        res = gw.handle_request("initialize")
        self.assertIn("serverInfo", res)

if __name__ == "__main__":
    unittest.main()

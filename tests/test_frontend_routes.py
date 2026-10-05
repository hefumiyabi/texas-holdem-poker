import importlib
import os
import unittest


class FrontendRoutesTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.environ.setdefault("POKER_ASYNC_MODE", "threading")
        os.environ.setdefault("POKER_DEBUG", "false")
        cls.app_module = importlib.import_module("app")
        cls.app_module.app.config.update(TESTING=True, SECRET_KEY="test-secret")

    def test_modern_spa_is_served_for_public_routes(self):
        client = self.app_module.app.test_client()
        for path in ("/", "/room/ABCDEF", "/table/ABCDEF"):
            response = client.get(path)
            self.assertEqual(response.status_code, 200, path)
            self.assertIn(b'<div id="root"></div>', response.data)

    def test_legacy_pages_remain_available_during_migration(self):
        client = self.app_module.app.test_client()
        self.assertEqual(client.get("/legacy/").status_code, 200)
        self.assertEqual(client.get("/legacy/lobby").status_code, 200)


if __name__ == "__main__":
    unittest.main()

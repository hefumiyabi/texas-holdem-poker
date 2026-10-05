import importlib
import os
from pathlib import Path
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]


class ProductionConfigTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.environ.setdefault("POKER_ASYNC_MODE", "threading")
        os.environ.setdefault("POKER_DEBUG", "false")
        cls.app_module = importlib.import_module("app")

    def test_health_endpoint_is_safe_and_machine_readable(self):
        response = self.app_module.app.test_client().get("/healthz")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"status": "ok"})

    def test_production_requires_secret_and_exact_origin(self):
        errors = self.app_module.production_config_errors({
            "POKER_ENV": "production",
            "POKER_SECRET_KEY": "",
            "POKER_ALLOWED_ORIGINS": "*",
            "POKER_COOKIE_SECURE": "false",
        })
        self.assertIn("POKER_SECRET_KEY", " ".join(errors))
        self.assertIn("POKER_ALLOWED_ORIGINS", " ".join(errors))
        self.assertIn("POKER_COOKIE_SECURE", " ".join(errors))

        insecure_origin = self.app_module.production_config_errors({
            "POKER_ENV": "production",
            "POKER_SECRET_KEY": "x" * 32,
            "POKER_ALLOWED_ORIGINS": "http://example.com",
            "POKER_COOKIE_SECURE": "true",
            "POKER_DEBUG": "false",
        })
        self.assertIn("POKER_ALLOWED_ORIGINS", " ".join(insecure_origin))

    def test_sqlite_paths_use_the_persistent_data_directory(self):
        from runtime_paths import data_file

        with tempfile.TemporaryDirectory() as tempdir:
            path = data_file("poker_game.db", {"POKER_DATA_DIR": tempdir})
            self.assertEqual(path, os.path.join(tempdir, "poker_game.db"))
            self.assertTrue(os.path.isdir(tempdir))

    def test_runtime_and_deployment_manifests_are_production_safe(self):
        requirements = (ROOT / "requirements.txt").read_text()
        dockerfile = (ROOT / "Dockerfile").read_text()
        render = (ROOT / "render.yaml").read_text()

        self.assertNotIn("eventlet", requirements.lower())
        self.assertIn("gunicorn", requirements.lower())
        self.assertIn("simple-websocket", requirements.lower())
        self.assertIn("FROM node:", dockerfile)
        self.assertIn("FROM python:3.12", dockerfile)
        self.assertIn("--workers 1", dockerfile)
        self.assertIn("/var/data", render)
        self.assertIn("/healthz", render)


if __name__ == "__main__":
    unittest.main()

import importlib
import os
import re
import tempfile
import unittest


class V1ApiTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.environ.setdefault("POKER_ASYNC_MODE", "threading")
        os.environ.setdefault("POKER_DEBUG", "false")
        cls.app_module = importlib.import_module("app")

    def setUp(self):
        from database import PokerDatabase

        self.tempdir = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.tempdir.name, "test.db")
        self.app_module.db = PokerDatabase(self.db_path)
        self.app_module.tables.clear()
        self.app_module.players.clear()
        self.app_module.player_sessions.clear()
        self.app_module.session_tables.clear()
        self.app_module.app.config.update(TESTING=True, SECRET_KEY="test-secret")
        if hasattr(self.app_module, "_rate_limit_buckets"):
            self.app_module._rate_limit_buckets.clear()

    def tearDown(self):
        self.tempdir.cleanup()

    def create_guest(self, client, nickname="Alice"):
        response = client.post("/api/v1/guest-sessions", json={"nickname": nickname})
        self.assertEqual(response.status_code, 201, response.get_data(as_text=True))
        return response.get_json()["player"]

    def test_same_nickname_creates_distinct_guest_identities(self):
        first_client = self.app_module.app.test_client()
        second_client = self.app_module.app.test_client()

        first = self.create_guest(first_client, "Alice")
        second = self.create_guest(second_client, "Alice")

        self.assertNotEqual(first["id"], second["id"])
        self.assertEqual(first["nickname"], "Alice")
        self.assertRegex(second["nickname"], r"^Alice(?:_\d+)?$")
        self.assertIsNotNone(first_client.get_cookie("poker_session"))
        self.assertIsNotNone(second_client.get_cookie("poker_session"))

    def test_cookie_restores_identity_and_logout_revokes_it(self):
        client = self.app_module.app.test_client()
        player = self.create_guest(client)

        restored = client.get("/api/v1/me")
        self.assertEqual(restored.status_code, 200)
        self.assertEqual(restored.get_json()["player"]["id"], player["id"])

        logged_out = client.delete("/api/v1/guest-sessions/current")
        self.assertEqual(logged_out.status_code, 204)
        self.assertEqual(client.get("/api/v1/me").status_code, 401)

    def test_guest_session_rejects_markup_and_overlong_names(self):
        client = self.app_module.app.test_client()

        markup = client.post("/api/v1/guest-sessions", json={"nickname": "<img src=x>"})
        overlong = client.post("/api/v1/guest-sessions", json={"nickname": "A" * 21})

        self.assertEqual(markup.status_code, 400)
        self.assertEqual(overlong.status_code, 400)

    def test_private_room_requires_auth_and_returns_six_character_code(self):
        anonymous = self.app_module.app.test_client()
        self.assertEqual(anonymous.post("/api/v1/rooms", json={"title": "Friday"}).status_code, 401)

        client = self.app_module.app.test_client()
        player = self.create_guest(client)
        response = client.post(
            "/api/v1/rooms",
            json={
                "title": "Friday Friends",
                "small_blind": 10,
                "big_blind": 20,
                "max_players": 6,
                "initial_chips": 1000,
            },
        )

        self.assertEqual(response.status_code, 201, response.get_data(as_text=True))
        payload = response.get_json()
        self.assertTrue(re.fullmatch(r"[A-Z2-9]{6}", payload["room"]["join_code"]))
        self.assertTrue(payload["room"]["invite_url"].endswith(f"/room/{payload['room']['join_code']}"))
        self.assertEqual(payload["room"]["host"]["id"], player["id"])

    def test_room_preview_is_private_safe_and_join_requires_auth(self):
        host = self.app_module.app.test_client()
        self.create_guest(host, "Host")
        created = host.post("/api/v1/rooms", json={"title": "Night Table"}).get_json()["room"]
        code = created["join_code"]

        anonymous = self.app_module.app.test_client()
        preview = anonymous.get(f"/api/v1/rooms/{code}")
        self.assertEqual(preview.status_code, 200)
        room = preview.get_json()["room"]
        self.assertEqual(room["title"], "Night Table")
        self.assertNotIn("host_id", room)
        self.assertNotIn("players", room)
        self.assertEqual(anonymous.post(f"/api/v1/rooms/{code}/join", json={}).status_code, 401)

        guest = self.app_module.app.test_client()
        guest_player = self.create_guest(guest, "Guest")
        joined = guest.post(f"/api/v1/rooms/{code}/join", json={"position": 1})
        self.assertEqual(joined.status_code, 200, joined.get_data(as_text=True))
        self.assertEqual(joined.get_json()["player"]["id"], guest_player["id"])
        self.assertEqual(joined.get_json()["room"]["join_code"], code)

    def test_invalid_room_parameters_and_stale_codes_are_rejected(self):
        client = self.app_module.app.test_client()
        self.create_guest(client)

        invalid = client.post(
            "/api/v1/rooms",
            json={"title": "", "small_blind": 20, "big_blind": 10, "max_players": 20},
        )

        self.assertEqual(invalid.status_code, 400)
        self.assertEqual(client.get("/api/v1/rooms/ABC123").status_code, 404)
        self.assertEqual(client.post("/api/v1/rooms/ABC123/join", json={}).status_code, 404)


if __name__ == "__main__":
    unittest.main()

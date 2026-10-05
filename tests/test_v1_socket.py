import importlib
import os
import tempfile
import unittest


class V1SocketTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.environ.setdefault("POKER_ASYNC_MODE", "threading")
        os.environ.setdefault("POKER_DEBUG", "false")
        cls.app_module = importlib.import_module("app")

    def setUp(self):
        from database import PokerDatabase

        self.tempdir = tempfile.TemporaryDirectory()
        self.app_module.db = PokerDatabase(os.path.join(self.tempdir.name, "socket.db"))
        self.app_module.tables.clear()
        self.app_module.players.clear()
        self.app_module.player_sessions.clear()
        self.app_module.session_tables.clear()
        self.app_module.v1_socket_sessions.clear()
        self.app_module.next_round_votes.clear()
        self.app_module.app.config.update(TESTING=True, SECRET_KEY="test-secret")
        if hasattr(self.app_module, "_rate_limit_buckets"):
            self.app_module._rate_limit_buckets.clear()

    def tearDown(self):
        self.tempdir.cleanup()

    def guest_client(self, nickname):
        client = self.app_module.app.test_client()
        response = client.post("/api/v1/guest-sessions", json={"nickname": nickname})
        self.assertEqual(response.status_code, 201)
        return client, response.get_json()["player"]

    def create_room(self, nickname="Host"):
        client, player = self.guest_client(nickname)
        response = client.post("/api/v1/rooms", json={"title": "Friends", "max_players": 6})
        self.assertEqual(response.status_code, 201)
        return client, player, response.get_json()["room"]

    @staticmethod
    def events_named(socket_client, name):
        return [event["args"][0] for event in socket_client.get_received() if event["name"] == name]

    def test_unauthenticated_socket_cannot_join_room(self):
        client = self.app_module.app.test_client()
        socket_client = self.app_module.socketio.test_client(
            self.app_module.app, flask_test_client=client
        )

        socket_client.emit("room:join", {"join_code": "ABCDEF"})
        errors = self.events_named(socket_client, "error")

        self.assertEqual(errors[-1]["code"], "auth_required")

    def test_authenticated_join_ignores_forged_player_id_and_emits_private_snapshot(self):
        host_client, host, room = self.create_room()
        socket_client = self.app_module.socketio.test_client(
            self.app_module.app, flask_test_client=host_client
        )

        socket_client.emit(
            "room:join",
            {"join_code": room["join_code"], "player_id": "forged-player"},
        )
        snapshots = self.events_named(socket_client, "room:snapshot")

        self.assertEqual(len(snapshots), 1)
        self.assertEqual(snapshots[0]["viewer_id"], host["id"])
        self.assertEqual(snapshots[0]["room"]["join_code"], room["join_code"])
        self.assertEqual(snapshots[0]["table"]["players"][0]["id"], host["id"])

    def test_non_host_cannot_add_bot_or_dissolve_room(self):
        host_client, _, room = self.create_room()
        guest_client, _ = self.guest_client("Guest")
        joined = guest_client.post(f"/api/v1/rooms/{room['join_code']}/join", json={"position": 1})
        self.assertEqual(joined.status_code, 200)
        socket_client = self.app_module.socketio.test_client(
            self.app_module.app, flask_test_client=guest_client
        )
        socket_client.emit("room:join", {"join_code": room["join_code"]})
        socket_client.get_received()

        socket_client.emit("bot:add", {"level": "beginner"})
        socket_client.emit("room:dissolve", {})
        errors = self.events_named(socket_client, "error")

        self.assertEqual([error["code"] for error in errors], ["host_required", "host_required"])
        self.assertEqual(host_client.get(f"/api/v1/rooms/{room['join_code']}").status_code, 200)

    def test_socket_cannot_act_without_room_membership(self):
        _, _, room = self.create_room()
        outsider_client, _ = self.guest_client("Outsider")
        socket_client = self.app_module.socketio.test_client(
            self.app_module.app, flask_test_client=outsider_client
        )

        socket_client.emit("player:act", {"join_code": room["join_code"], "action": "fold"})
        errors = self.events_named(socket_client, "error")

        self.assertEqual(errors[-1]["code"], "room_membership_required")

    def test_reconnect_restores_seat_and_own_hole_cards(self):
        host_client, host, room = self.create_room()
        guest_client, _ = self.guest_client("Guest")
        guest_client.post(f"/api/v1/rooms/{room['join_code']}/join", json={"position": 1})

        host_socket = self.app_module.socketio.test_client(
            self.app_module.app, flask_test_client=host_client
        )
        guest_socket = self.app_module.socketio.test_client(
            self.app_module.app, flask_test_client=guest_client
        )
        host_socket.emit("room:join", {"join_code": room["join_code"]})
        guest_socket.emit("room:join", {"join_code": room["join_code"]})
        host_socket.get_received()
        guest_socket.get_received()
        host_socket.emit("hand:start", {})
        self.assertTrue(self.events_named(host_socket, "hand:started"))

        host_socket.disconnect()
        reconnected = self.app_module.socketio.test_client(
            self.app_module.app, flask_test_client=host_client
        )
        reconnected.emit("room:join", {"join_code": room["join_code"]})
        snapshots = self.events_named(reconnected, "room:snapshot")
        own = next(player for player in snapshots[-1]["table"]["players"] if player["id"] == host["id"])

        self.assertEqual(snapshots[-1]["viewer_id"], host["id"])
        self.assertEqual(len(own["hole_cards"]), 2)

    def test_expired_host_disconnect_transfers_host_to_first_human(self):
        _host_client, host, room = self.create_room()
        guest_client, guest = self.guest_client("Guest")
        guest_client.post(f"/api/v1/rooms/{room['join_code']}/join", json={"position": 1})
        table_id = room["id"]

        self.app_module._finalize_v1_disconnect(host["id"], table_id)
        record = self.app_module.db.get_table(table_id)

        self.assertIsNotNone(record)
        self.assertEqual(record["host_id"], guest["id"])
        self.assertNotIn(host["id"], [row["player_id"] for row in self.app_module.db.get_table_players(table_id)])


if __name__ == "__main__":
    unittest.main()

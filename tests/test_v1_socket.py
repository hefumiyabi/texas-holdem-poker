import importlib
import os
import tempfile
import threading
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
        self.app_module._table_state_locks.clear()
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

    def test_legacy_socket_cannot_enter_private_room_by_uuid_or_nickname(self):
        _host_client, host, room = self.create_room("River")
        legacy_client = self.app_module.app.test_client()
        legacy_socket = self.app_module.socketio.test_client(
            self.app_module.app, flask_test_client=legacy_client
        )
        legacy_socket.emit("register_player", {"nickname": "River"})
        registrations = self.events_named(legacy_socket, "register_response")
        self.assertNotEqual(registrations[-1]["player_id"], host["id"])

        legacy_socket.emit("join_table", {"table_id": room["id"]})
        errors = self.events_named(legacy_socket, "error")
        self.assertEqual(errors[-1]["message"], "房间不存在")

    def test_legacy_public_socket_rejects_god_bots(self):
        client = self.app_module.app.test_client()
        socket_client = self.app_module.socketio.test_client(self.app_module.app, flask_test_client=client)
        socket_client.emit("register_player", {"nickname": "Legacy Host"})
        socket_client.get_received()

        socket_client.emit("create_table", {"title": "No God", "bots": {"god": 1}})

        errors = self.events_named(socket_client, "error")
        self.assertEqual(errors[-1]["message"], "机器人等级无效")
        self.assertFalse(any(table.title == "No God" for table in self.app_module.tables.values()))

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

    def test_revoked_cookie_invalidates_an_existing_socket(self):
        host_client, _, room = self.create_room()
        socket_client = self.app_module.socketio.test_client(
            self.app_module.app, flask_test_client=host_client
        )
        socket_client.emit("room:join", {"join_code": room["join_code"]})
        socket_client.get_received()
        host_client.delete("/api/v1/guest-sessions/current")

        socket_client.emit("bot:add", {"level": "beginner"})
        errors = self.events_named(socket_client, "error")

        self.assertEqual(errors[-1]["code"], "auth_required")

    def test_round_vote_is_rejected_while_hand_is_active(self):
        host_client, _, room = self.create_room()
        guest_client, _ = self.guest_client("Guest")
        guest_client.post(f"/api/v1/rooms/{room['join_code']}/join", json={"position": 1})
        host_socket = self.app_module.socketio.test_client(
            self.app_module.app, flask_test_client=host_client
        )
        host_socket.emit("room:join", {"join_code": room["join_code"]})
        host_socket.get_received()
        host_socket.emit("hand:start", {})
        host_socket.get_received()

        host_socket.emit("round:vote", {})
        errors = self.events_named(host_socket, "error")

        self.assertEqual(errors[-1]["code"], "vote_unavailable")

    def test_concurrent_round_votes_start_exactly_one_hand(self):
        host_client, _, room = self.create_room()
        first = self.app_module.socketio.test_client(self.app_module.app, flask_test_client=host_client)
        second = self.app_module.socketio.test_client(self.app_module.app, flask_test_client=host_client)
        for socket_client in (first, second):
            socket_client.emit("room:join", {"join_code": room["join_code"]})
            socket_client.get_received()
        first.emit("bot:add", {"level": "beginner", "persona": "balanced"})
        first.get_received()
        table = self.app_module.tables[room["id"]]
        table.game_stage = self.app_module.GameStage.FINISHED
        table.hand_number = 1

        barrier = threading.Barrier(3)
        threads = [threading.Thread(target=lambda client=client: (barrier.wait(), client.emit("round:vote", {}))) for client in (first, second)]
        for thread in threads:
            thread.start()
        barrier.wait()
        for thread in threads:
            thread.join(3)

        self.assertEqual(table.hand_number, 2)
        self.assertEqual(table.game_stage, self.app_module.GameStage.PRE_FLOP)

    def test_round_vote_with_one_player_preserves_finished_state(self):
        host_client, _, room = self.create_room()
        socket_client = self.app_module.socketio.test_client(
            self.app_module.app, flask_test_client=host_client
        )
        socket_client.emit("room:join", {"join_code": room["join_code"]})
        socket_client.get_received()
        table = self.app_module.tables[room["id"]]
        table.game_stage = self.app_module.GameStage.FINISHED
        table.hand_number = 1
        original_status = table.players[0].status

        socket_client.emit("round:vote", {})

        errors = self.events_named(socket_client, "error")
        self.assertEqual(errors[-1]["code"], "not_enough_players")
        self.assertEqual(table.hand_number, 1)
        self.assertEqual(table.game_stage, self.app_module.GameStage.FINISHED)
        self.assertEqual(table.players[0].status, original_status)

    def test_bot_first_action_pushes_a_fresh_v1_snapshot(self):
        host_client, host, room = self.create_room()
        host_socket = self.app_module.socketio.test_client(
            self.app_module.app, flask_test_client=host_client
        )
        host_socket.emit("room:join", {"join_code": room["join_code"]})
        host_socket.get_received()
        host_socket.emit("bot:add", {"level": "beginner"})
        host_socket.get_received()

        table = self.app_module.tables[room["id"]]
        table.dealer_id = host["id"]
        table.hand_number = 1
        host_socket.emit("hand:start", {})
        host_socket.get_received()
        pushed = []
        for _ in range(30):
            self.app_module.socketio.sleep(0.1)
            events = host_socket.get_received()
            pushed.extend(
                event for event in events
                if event["name"] in ("turn:changed", "hand:completed")
            )
            if pushed:
                break
        self.assertTrue(pushed)
        self.assertIn("table", pushed[-1]["args"][0])

    def test_host_can_manage_persona_bots_only_while_waiting(self):
        host_client, _, room = self.create_room()
        host_socket = self.app_module.socketio.test_client(
            self.app_module.app, flask_test_client=host_client
        )
        host_socket.emit("room:join", {"join_code": room["join_code"]})
        host_socket.get_received()

        host_socket.emit("bot:add", {"level": "god", "persona": "balanced"})
        host_socket.emit("bot:add", {"level": "advanced", "persona": "unknown"})
        errors = self.events_named(host_socket, "error")
        self.assertEqual([error["code"] for error in errors], [
            "invalid_bot_level", "invalid_bot_persona"
        ])

        host_socket.emit("bot:add", {"level": "advanced", "persona": "aggressive"})
        snapshots = self.events_named(host_socket, "room:snapshot")
        bot = next(player for player in snapshots[-1]["table"]["players"] if player["is_bot"])
        self.assertEqual(bot["bot_level"], "advanced")
        self.assertEqual(bot["bot_persona"], "aggressive")
        self.assertEqual(bot["persona_label"], "爱诈唬")
        self.assertNotIn("hole_cards", bot)

        host_socket.emit("bot:replace", {
            "player_id": bot["id"], "level": "intermediate", "persona": "tricky"
        })
        replaced = self.events_named(host_socket, "room:snapshot")[-1]
        replacement = next(player for player in replaced["table"]["players"] if player["is_bot"])
        self.assertEqual(replacement["bot_persona"], "tricky")
        self.assertEqual(len(replaced["table"]["players"]), 2)

        host_socket.emit("bot:remove", {"player_id": replacement["id"]})
        removed = self.events_named(host_socket, "room:snapshot")[-1]
        self.assertEqual(len(removed["table"]["players"]), 1)

    def test_host_can_adjust_bots_after_a_completed_hand(self):
        host_client, _, room = self.create_room()
        host_socket = self.app_module.socketio.test_client(
            self.app_module.app, flask_test_client=host_client
        )
        host_socket.emit("room:join", {"join_code": room["join_code"]})
        host_socket.get_received()
        host_socket.emit("bot:add", {"level": "intermediate", "persona": "tight"})
        snapshot = self.events_named(host_socket, "room:snapshot")[-1]
        bot_id = next(player["id"] for player in snapshot["table"]["players"] if player["is_bot"])
        self.app_module.tables[room["id"]].game_stage = self.app_module.GameStage.FINISHED

        host_socket.emit("bot:remove", {"player_id": bot_id})

        snapshots = self.events_named(host_socket, "room:snapshot")
        self.assertEqual(len(snapshots[-1]["table"]["players"]), 1)

    def test_bot_add_and_hand_start_share_one_table_lock(self):
        host_client, _, room = self.create_room()
        second_client, _ = self.guest_client("Second")
        second_client.post(f"/api/v1/rooms/{room['join_code']}/join", json={"position": 1})
        add_socket = self.app_module.socketio.test_client(
            self.app_module.app, flask_test_client=host_client
        )
        start_socket = self.app_module.socketio.test_client(
            self.app_module.app, flask_test_client=host_client
        )
        for client in (add_socket, start_socket):
            client.emit("room:join", {"join_code": room["join_code"]})
            client.get_received()

        entered = threading.Event()
        release = threading.Event()
        original_add = self.app_module.db.add_table_bot

        def blocked_add(*args, **kwargs):
            entered.set()
            release.wait(2)
            return original_add(*args, **kwargs)

        self.app_module.db.add_table_bot = blocked_add
        add_thread = threading.Thread(target=lambda: add_socket.emit(
            "bot:add", {"level": "intermediate", "persona": "balanced"}
        ))
        start_thread = threading.Thread(target=lambda: start_socket.emit("hand:start", {}))
        try:
            add_thread.start()
            self.assertTrue(entered.wait(1))
            start_thread.start()
            release.set()
            add_thread.join(3)
            start_thread.join(3)
        finally:
            self.app_module.db.add_table_bot = original_add
            release.set()

        table = self.app_module.tables[room["id"]]
        self.assertEqual(table.game_stage, self.app_module.GameStage.PRE_FLOP)
        self.assertEqual(len(table.players), len(table.hand_players))

    def test_bot_changes_reject_full_room_and_active_hand(self):
        host_client, _, room = self.create_room()
        record = self.app_module.db.get_table(room["id"])
        with self.app_module.db.get_connection() as conn:
            conn.execute("UPDATE tables SET max_players = 2 WHERE id = ?", (room["id"],))
            conn.commit()
        self.app_module.tables.pop(room["id"], None)
        host_socket = self.app_module.socketio.test_client(
            self.app_module.app, flask_test_client=host_client
        )
        host_socket.emit("room:join", {"join_code": room["join_code"]})
        host_socket.get_received()
        host_socket.emit("bot:add", {"level": "beginner", "persona": "caller"})
        snapshot = self.events_named(host_socket, "room:snapshot")[-1]
        bot_id = next(player["id"] for player in snapshot["table"]["players"] if player["is_bot"])

        host_socket.emit("bot:add", {"level": "beginner", "persona": "tight"})
        self.assertEqual(self.events_named(host_socket, "error")[-1]["code"], "room_full")

        host_socket.emit("hand:start", {})
        host_socket.get_received()
        host_socket.emit("bot:remove", {"player_id": bot_id})
        self.assertEqual(self.events_named(host_socket, "error")[-1]["code"], "hand_in_progress")

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

    def test_reconnect_does_not_resurrect_a_folded_player(self):
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
        host_socket.get_received()
        host_socket.emit("player:act", {"action": "fold"})
        host_socket.get_received()
        host_socket.disconnect()

        reconnected = self.app_module.socketio.test_client(
            self.app_module.app, flask_test_client=host_client
        )
        reconnected.emit("room:join", {"join_code": room["join_code"]})
        snapshots = self.events_named(reconnected, "room:snapshot")
        own = next(player for player in snapshots[-1]["table"]["players"] if player["id"] == host["id"])

        self.assertNotEqual(own["status"], "playing")

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

    def test_host_leave_transfers_control_immediately(self):
        host_client, _host, room = self.create_room()
        guest_client, guest = self.guest_client("Guest")
        guest_client.post(f"/api/v1/rooms/{room['join_code']}/join", json={"position": 1})
        host_socket = self.app_module.socketio.test_client(
            self.app_module.app, flask_test_client=host_client
        )
        host_socket.emit("room:join", {"join_code": room["join_code"]})
        host_socket.get_received()

        host_socket.emit("room:leave", {})

        record = self.app_module.db.get_table(room["id"])
        self.assertIsNotNone(record)
        self.assertEqual(record["host_id"], guest["id"])

    def test_background_host_cleanup_can_broadcast_without_request_context(self):
        host_client, host, room = self.create_room()
        guest_client, guest = self.guest_client("Guest")
        guest_client.post(f"/api/v1/rooms/{room['join_code']}/join", json={"position": 1})
        guest_socket = self.app_module.socketio.test_client(
            self.app_module.app, flask_test_client=guest_client
        )
        guest_socket.emit("room:join", {"join_code": room["join_code"]})
        guest_socket.get_received()

        self.app_module._finalize_v1_disconnect(host["id"], room["id"])

        snapshots = self.events_named(guest_socket, "room:snapshot")
        self.assertTrue(snapshots)
        self.assertEqual(snapshots[-1]["room"]["host"]["id"], guest["id"])


if __name__ == "__main__":
    unittest.main()

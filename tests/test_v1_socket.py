import importlib
import os
import tempfile
import threading
import unittest
from unittest import mock


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
        self.app_module.pending_v1_disconnects.clear()
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

    def create_room(self, nickname="Host", **overrides):
        client, player = self.guest_client(nickname)
        payload = {"title": "Friends", "max_players": 6, **overrides}
        response = client.post("/api/v1/rooms", json=payload)
        self.assertEqual(response.status_code, 201)
        return client, player, response.get_json()["room"]

    def make_player_broke(self, room, player_id, *, stage="finished"):
        table = self.app_module.tables[room["id"]]
        player = table.get_player(player_id)
        player.chips = 0
        player.status = self.app_module.PlayerStatus.BROKE
        player.tournament_status = "busted"
        table.game_stage = self.app_module.GameStage(stage)
        self.app_module.db.save_table_progress(table)
        self.app_module.db.update_table_player_tournament_state(
            room["id"], player_id, rebuys_used=player.rebuys_used,
            tournament_status="busted", disconnected_at=None,
        )
        return table, player

    def create_challenge(self, nickname="Coach Hero"):
        client, player = self.guest_client(nickname)
        response = client.post("/api/v1/rooms", json={
            "mode": "bot_challenge", "difficulty": "intermediate", "seat_count": 2,
            "personas": ["balanced"],
        })
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

    def test_human_rebuy_limits_restore_exactly_one_initial_stack(self):
        cases = ((0, False), (1, True), (2, True), (3, True), ("unlimited", True))
        for index, (limit, allowed) in enumerate(cases):
            with self.subTest(limit=limit):
                host_client, host, room = self.create_room(
                    f"Host{index}", initial_chips=5000, rebuy_limit=limit,
                )
                socket_client = self.app_module.socketio.test_client(
                    self.app_module.app, flask_test_client=host_client
                )
                socket_client.emit("room:join", {"join_code": room["join_code"]})
                socket_client.get_received()
                _table, player = self.make_player_broke(room, host["id"])

                socket_client.emit("player:rebuy", {})

                if allowed:
                    snapshot = self.events_named(socket_client, "room:snapshot")[-1]
                    own = next(item for item in snapshot["table"]["players"] if item["id"] == host["id"])
                    self.assertEqual(own["chips"], 5000)
                    self.assertEqual(own["rebuys_used"], 1)
                    self.assertEqual(own["tournament_status"], "active")
                else:
                    self.assertEqual(self.events_named(socket_client, "error")[-1]["code"], "rebuy_exhausted")
                    self.assertEqual(player.chips, 0)

    def test_rebuy_rejects_active_hand_non_broke_human_and_bot(self):
        host_client, host, room = self.create_room(rebuy_limit=3)
        socket_client = self.app_module.socketio.test_client(
            self.app_module.app, flask_test_client=host_client
        )
        socket_client.emit("room:join", {"join_code": room["join_code"]})
        socket_client.get_received()

        socket_client.emit("player:rebuy", {})
        self.assertEqual(self.events_named(socket_client, "error")[-1]["code"], "rebuy_not_broke")

        table, _player = self.make_player_broke(room, host["id"], stage="pre_flop")
        socket_client.emit("player:rebuy", {})
        self.assertEqual(self.events_named(socket_client, "error")[-1]["code"], "hand_in_progress")

        bot = self.app_module.Bot("bot-no-rebuy", "Bot", 0)
        bot.status = self.app_module.PlayerStatus.BROKE
        bot.rebuys_used = 0
        bot.tournament_status = "busted"
        table.add_player_at_position(bot, 1)
        self.app_module.players[bot.id] = bot
        with self.app_module.db.get_connection() as conn:
            now = self.app_module.time.time()
            conn.execute(
                "INSERT INTO users (id, nickname, chips, created_at, last_active) VALUES (?, ?, 0, ?, ?)",
                (bot.id, bot.nickname, now, now),
            )
            conn.execute(
                "INSERT INTO table_players (table_id, player_id, position, chips, is_bot, joined_at) VALUES (?, ?, 1, 0, 1, ?)",
                (room["id"], bot.id, now),
            )
            conn.commit()
        result = self.app_module.db.try_rebuy_player(room["id"], bot.id, 5000)
        self.assertFalse(result["success"])
        self.assertEqual(result["code"], "bot_rebuy_forbidden")

    def test_two_concurrent_rebuys_award_only_one_stack(self):
        _client, host, room = self.create_room(initial_chips=1000, rebuy_limit=1)
        self.make_player_broke(room, host["id"])
        barrier = threading.Barrier(3)
        results = []

        def rebuy():
            barrier.wait()
            results.append(self.app_module.db.try_rebuy_player(room["id"], host["id"], 1000))

        threads = [threading.Thread(target=rebuy) for _ in range(2)]
        for thread in threads:
            thread.start()
        barrier.wait()
        for thread in threads:
            thread.join(3)

        self.assertEqual(sum(bool(result["success"]) for result in results), 1)
        row = next(row for row in self.app_module.db.get_table_players(room["id"]) if row["player_id"] == host["id"])
        self.assertEqual(row["chips"], 1000)
        self.assertEqual(row["rebuys_used"], 1)

    def test_broke_human_can_spectate_then_rebuy_between_hands(self):
        host_client, host, room = self.create_room(initial_chips=1000, rebuy_limit=1)
        socket_client = self.app_module.socketio.test_client(
            self.app_module.app, flask_test_client=host_client
        )
        socket_client.emit("room:join", {"join_code": room["join_code"]})
        socket_client.get_received()
        self.make_player_broke(room, host["id"])

        socket_client.emit("player:spectate", {})
        spectating = self.events_named(socket_client, "room:snapshot")[-1]
        own = next(item for item in spectating["table"]["players"] if item["id"] == host["id"])
        self.assertEqual(own["tournament_status"], "spectating")
        self.assertTrue(own["can_rebuy"])
        self.assertEqual(own["rebuys_used"], 0)

        socket_client.emit("player:rebuy", {})
        active = self.events_named(socket_client, "room:snapshot")[-1]
        own = next(item for item in active["table"]["players"] if item["id"] == host["id"])
        self.assertEqual(own["tournament_status"], "active")
        self.assertEqual(own["chips"], 1000)

    def test_challenge_snapshot_includes_cached_public_analysis_only_while_active(self):
        _client, hero, room = self.create_challenge()
        record = self.app_module.db.get_table(room["id"])
        table = self.app_module.tables[room["id"]]
        self.assertTrue(table.start_new_hand())
        expected = {
            "equity": 0.62, "pot_odds": 0.2, "recommended_action": "raise",
            "reason": "value_advantage", "sample_size": 1500,
        }

        with mock.patch.object(self.app_module, "calculate_advice", return_value=expected) as advisor:
            first = self.app_module._v1_snapshot(record, table, hero["id"])
            second = self.app_module._v1_snapshot(record, table, hero["id"])
            self.assertEqual(first["analysis"], expected)
            self.assertEqual(second["analysis"], expected)
            self.assertEqual(advisor.call_count, 1)
            args = advisor.call_args.args
            self.assertEqual(args[2], 1)
            self.assertEqual(len(args), 7)
            self.assertIsInstance(args[6], int)

            table.pot += 1
            self.app_module._v1_snapshot(record, table, hero["id"])
            self.assertEqual(advisor.call_count, 2)

        table.game_stage = self.app_module.GameStage.FINISHED
        self.assertNotIn("analysis", self.app_module._v1_snapshot(record, table, hero["id"]))

    def test_analysis_is_omitted_for_private_rooms_and_advisor_failures(self):
        _client, hero, room = self.create_room()
        record = self.app_module.db.get_table(room["id"])
        table = self.app_module.tables[room["id"]]
        guest = self.app_module.Player("guest", "Guest", 1000)
        table.add_player(guest)
        self.assertTrue(table.start_new_hand())
        self.assertNotIn("analysis", self.app_module._v1_snapshot(record, table, hero["id"]))

        record["room_mode"] = "bot_challenge"
        with mock.patch.object(self.app_module, "calculate_advice", side_effect=RuntimeError("boom")):
            snapshot = self.app_module._v1_snapshot(record, table, hero["id"])
        self.assertIn("table", snapshot)
        self.assertNotIn("analysis", snapshot)

    def test_finished_snapshot_restores_sanitized_hand_result(self):
        _client, hero, room = self.create_challenge()
        record = self.app_module.db.get_table(room["id"])
        table = self.app_module.tables[room["id"]]
        table.last_hand_result = {
            "is_showdown": True, "win_reason": "best_hand", "winners": [],
            "showdown_players": [], "community_cards": [], "pots": [],
        }
        table.game_stage = self.app_module.GameStage.FINISHED

        snapshot = self.app_module._v1_snapshot(record, table, hero["id"])

        self.assertEqual(snapshot["last_hand_result"]["win_reason"], "best_hand")

    def test_human_turn_snapshot_has_no_action_deadline(self):
        _client, hero, room = self.create_challenge()
        record = self.app_module.db.get_table(room["id"])
        table = self.app_module.tables[room["id"]]
        self.assertTrue(table.start_new_hand())

        self.app_module._sync_turn_clock(room["id"])
        snapshot = self.app_module._v1_snapshot(record, table, hero["id"])

        self.assertNotIn("turn_deadline", snapshot)
        self.assertNotIn("thinking_until", snapshot)
        self.assertIsNone(table.turn_deadline)

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

    def test_forced_blind_all_ins_finish_immediately(self):
        host_client, _, room = self.create_challenge()
        socket_client = self.app_module.socketio.test_client(
            self.app_module.app, flask_test_client=host_client
        )
        socket_client.emit("room:join", {"join_code": room["join_code"]})
        socket_client.get_received()
        table = self.app_module.tables[room["id"]]
        table.base_small_blind = table.small_blind = 1000
        table.base_big_blind = table.big_blind = 2000
        table.min_raise = 2000
        for player in table.players:
            player.chips = 1000

        socket_client.emit("hand:start", {})

        self.assertEqual(table.game_stage, self.app_module.GameStage.FINISHED)
        self.assertIsNotNone(table.last_hand_result)
        self.assertTrue(self.events_named(socket_client, "hand:completed"))

    def test_reconstruction_keeps_completed_hand_and_table_stacks(self):
        _client, hero, room = self.create_challenge()
        table = self.app_module.tables[room["id"]]
        table.hand_number = 10
        table.blind_level = 2
        table.game_stage = self.app_module.GameStage.FINISHED
        table.get_player(hero["id"]).chips = 4321
        self.app_module.db.save_table_progress(table)
        self.app_module.tables.clear()

        restored = self.app_module._table_from_record(self.app_module.db.get_table(room["id"]))

        self.assertEqual(restored.hand_number, 10)
        self.assertEqual(restored.get_player(hero["id"]).chips, 4321)
        self.assertEqual((restored.small_blind, restored.big_blind), (15, 30))

    def test_disconnect_cleanup_folds_current_player_and_finishes_heads_up_hand(self):
        host_client, host, room = self.create_room()
        guest_client, _guest = self.guest_client("Guest")
        self.assertEqual(guest_client.post(f"/api/v1/rooms/{room['join_code']}/join", json={"position": 1}).status_code, 200)
        host_socket = self.app_module.socketio.test_client(self.app_module.app, flask_test_client=host_client)
        host_socket.emit("room:join", {"join_code": room["join_code"]})
        host_socket.get_received()
        host_socket.emit("hand:start", {})
        table = self.app_module.tables[room["id"]]
        self.assertEqual(table.get_current_player().id, host["id"])

        table.get_player(host["id"]).disconnected_at = 1000
        self.app_module.db.set_player_disconnected_at(room["id"], host["id"], 1000)
        self.app_module._finalize_v1_disconnect(host["id"], room["id"], now=4600)

        self.assertEqual(table.game_stage, self.app_module.GameStage.FINISHED)
        self.assertEqual(table.last_hand_result["win_reason"], "others_folded")

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

    def test_player_action_rejects_non_integer_socket_amounts_without_mutation(self):
        host_client, host = self.guest_client("Host")
        created = host_client.post("/api/v1/rooms", json={
            "title": "JPY", "max_players": 2, "currency": "JPY",
            "initial_chips": 1000, "small_blind": 100, "big_blind": 200,
        })
        room = created.get_json()["room"]
        guest_client, _ = self.guest_client("Guest")
        guest_client.post(f"/api/v1/rooms/{room['join_code']}/join", json={"position": 1})
        socket_client = self.app_module.socketio.test_client(
            self.app_module.app, flask_test_client=host_client
        )
        socket_client.emit("room:join", {"join_code": room["join_code"]})
        socket_client.get_received()
        socket_client.emit("hand:start", {})
        socket_client.get_received()
        table = self.app_module.tables[room["id"]]
        self.assertEqual(table.get_current_player().id, host["id"])
        original = (table.pot, table.current_bet, table.get_player(host["id"]).chips)

        for invalid in (400.9, "400", True, None, -1):
            socket_client.emit("player:act", {"action": "raise", "amount": invalid})
            errors = self.events_named(socket_client, "error")
            self.assertEqual(errors[-1]["code"], "invalid_action", invalid)
            self.assertEqual(
                (table.pot, table.current_bet, table.get_player(host["id"]).chips),
                original,
                invalid,
            )

    def test_jpy_action_events_and_minimum_errors_are_structured_without_dollars(self):
        host_client, _ = self.guest_client("Host")
        created = host_client.post("/api/v1/rooms", json={
            "title": "JPY", "max_players": 2, "currency": "JPY",
            "initial_chips": 1000, "small_blind": 100, "big_blind": 200,
        })
        room = created.get_json()["room"]
        guest_client, _ = self.guest_client("Guest")
        guest_client.post(f"/api/v1/rooms/{room['join_code']}/join", json={"position": 1})
        socket_client = self.app_module.socketio.test_client(
            self.app_module.app, flask_test_client=host_client
        )
        socket_client.emit("room:join", {"join_code": room["join_code"]})
        socket_client.get_received()
        socket_client.emit("hand:start", {})
        socket_client.get_received()

        turn_token = self.app_module.tables[room["id"]].get_turn_token()
        socket_client.emit("player:act", {"action": "raise", "amount": 300, "turn_token": turn_token})
        rejected = self.events_named(socket_client, "error")[-1]
        self.assertEqual(rejected["minimum"], 400)
        self.assertEqual(rejected["action"], "raise")
        self.assertEqual(rejected["currency"], "JPY")
        self.assertNotIn("$", rejected["message"])

        socket_client.emit("player:act", {"action": "raise", "amount": 400, "turn_token": turn_token})
        resolved = self.events_named(socket_client, "action:resolved")[-1]
        self.assertEqual(resolved["action"], "raise")
        self.assertEqual(resolved["amount"], 300)
        self.assertEqual(resolved["target_amount"], 400)
        self.assertEqual(resolved["currency"], "JPY")
        self.assertNotIn("description", resolved)

    def test_duplicate_human_turn_token_is_rejected_without_mutation(self):
        host_client, host, room = self.create_room()
        guest_client, _ = self.guest_client("Guest")
        guest_client.post(f"/api/v1/rooms/{room['join_code']}/join", json={"position": 1})
        socket_client = self.app_module.socketio.test_client(
            self.app_module.app, flask_test_client=host_client
        )
        socket_client.emit("room:join", {"join_code": room["join_code"]})
        socket_client.get_received()
        socket_client.emit("hand:start", {})
        socket_client.get_received()
        table = self.app_module.tables[room["id"]]
        self.assertEqual(table.get_current_player().id, host["id"])
        token = table.get_turn_token()

        socket_client.emit("player:act", {"action": "fold", "turn_token": token})
        after_first = (table.pot, table.current_bet, [p.chips for p in table.players], table.action_revision)
        socket_client.get_received()
        socket_client.emit("player:act", {"action": "fold", "turn_token": token})

        self.assertEqual(self.events_named(socket_client, "error")[-1]["code"], "stale_turn")
        self.assertEqual((table.pot, table.current_bet, [p.chips for p in table.players], table.action_revision), after_first)

    def test_out_of_turn_actor_cannot_mutate_table_with_current_token(self):
        host_client, host, room = self.create_room()
        guest_client, _guest = self.guest_client("Guest")
        guest_client.post(f"/api/v1/rooms/{room['join_code']}/join", json={"position": 1})
        host_socket = self.app_module.socketio.test_client(self.app_module.app, flask_test_client=host_client)
        guest_socket = self.app_module.socketio.test_client(self.app_module.app, flask_test_client=guest_client)
        for client in (host_socket, guest_socket):
            client.emit("room:join", {"join_code": room["join_code"]})
            client.get_received()
        host_socket.emit("hand:start", {})
        host_socket.get_received(); guest_socket.get_received()
        table = self.app_module.tables[room["id"]]
        self.assertEqual(table.get_current_player().id, host["id"])
        before = (table.pot, table.current_bet, [p.chips for p in table.players], table.action_revision)

        guest_socket.emit("player:act", {"action": "fold", "turn_token": table.get_turn_token()})

        self.assertEqual(self.events_named(guest_socket, "error")[-1]["code"], "action_rejected")
        self.assertEqual((table.pot, table.current_bet, [p.chips for p in table.players], table.action_revision), before)

    def test_bot_sleep_overlap_discards_stale_decision_without_mutation(self):
        _client, hero, room = self.create_challenge()
        table = self.app_module.tables[room["id"]]
        self.assertTrue(table.start_new_hand())
        self.assertEqual(table.get_current_player().id, hero["id"])
        table.process_player_action(hero["id"], self.app_module.PlayerAction.CALL)
        bot = table.get_current_player()
        self.assertTrue(bot.is_bot)
        before = (table.pot, table.current_bet, [p.chips for p in table.players], [p.current_bet for p in table.players])
        revision = table.action_revision

        def overlapping_state_change(_delay):
            table.action_revision += 1

        with mock.patch.object(self.app_module.socketio, "sleep", side_effect=overlapping_state_change), \
             mock.patch.object(bot, "thinking_time", return_value=0.01), \
             mock.patch.object(bot, "decide_action", wraps=bot.decide_action) as decide:
            result = self.app_module._process_bot_actions_locked(room["id"])

        self.assertTrue(result["stale_turn"])
        self.assertEqual((table.pot, table.current_bet, [p.chips for p in table.players], [p.current_bet for p in table.players]), before)
        self.assertEqual(table.action_revision, revision + 1)
        decide.assert_not_called()

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
        table = self.app_module.tables[room["id"]]
        host_socket.emit("player:act", {"action": "fold", "turn_token": table.get_turn_token()})
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
        table = self.app_module._table_from_record(self.app_module.db.get_table(table_id))
        table.get_player(host["id"]).disconnected_at = 1000
        self.app_module.db.set_player_disconnected_at(table_id, host["id"], 1000)

        self.app_module._finalize_v1_disconnect(host["id"], table_id, now=4600)
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
        table = self.app_module.tables[room["id"]]
        table.get_player(host["id"]).disconnected_at = 1000
        self.app_module.db.set_player_disconnected_at(room["id"], host["id"], 1000)

        self.app_module._finalize_v1_disconnect(host["id"], room["id"], now=4600)

        snapshots = self.events_named(guest_socket, "room:snapshot")
        self.assertTrue(snapshots)
        self.assertEqual(snapshots[-1]["room"]["host"]["id"], guest["id"])

    def test_connected_idle_heartbeat_keeps_membership(self):
        host_client, host, room = self.create_room()
        socket_client = self.app_module.socketio.test_client(self.app_module.app, flask_test_client=host_client)
        socket_client.emit("room:join", {"join_code": room["join_code"]})
        socket_client.get_received()

        with mock.patch.object(self.app_module.time, "time", return_value=10_000):
            socket_client.emit("room:heartbeat", {})

        self.assertIn(host["id"], [row["player_id"] for row in self.app_module.db.get_table_players(room["id"])])
        self.assertTrue(self.events_named(socket_client, "connection:status")[-1]["heartbeat"])

    def test_reconnect_at_3599_seconds_restores_the_same_seat(self):
        host_client, host, room = self.create_room()
        socket_client = self.app_module.socketio.test_client(self.app_module.app, flask_test_client=host_client)
        socket_client.emit("room:join", {"join_code": room["join_code"]})
        socket_client.get_received()
        original_position = self.app_module.db.get_table_players(room["id"])[0]["position"]
        with mock.patch.object(self.app_module.time, "time", return_value=1000):
            socket_client.disconnect()

        reconnected = self.app_module.socketio.test_client(self.app_module.app, flask_test_client=host_client)
        with mock.patch.object(self.app_module.time, "time", return_value=4599):
            reconnected.emit("room:join", {"join_code": room["join_code"]})

        self.assertTrue(self.events_named(reconnected, "room:snapshot"))
        row = next(row for row in self.app_module.db.get_table_players(room["id"]) if row["player_id"] == host["id"])
        self.assertEqual(row["position"], original_position)
        self.assertIsNone(row["disconnected_at"])

    def test_disconnected_seat_expires_at_3600_seconds(self):
        host_client, host, room = self.create_room()
        guest_client, _guest = self.guest_client("Guest")
        guest_client.post(f"/api/v1/rooms/{room['join_code']}/join", json={"position": 1})
        socket_client = self.app_module.socketio.test_client(self.app_module.app, flask_test_client=host_client)
        socket_client.emit("room:join", {"join_code": room["join_code"]})
        socket_client.get_received()
        with mock.patch.object(self.app_module.time, "time", return_value=1000):
            socket_client.disconnect()

        self.app_module._expire_disconnected_players(room["id"], now=4600)

        self.assertNotIn(host["id"], [row["player_id"] for row in self.app_module.db.get_table_players(room["id"])])

    def test_current_disconnect_pauses_clock_without_changing_gameplay_status(self):
        host_client, host, room = self.create_room()
        guest_client, _guest = self.guest_client("Guest")
        guest_client.post(f"/api/v1/rooms/{room['join_code']}/join", json={"position": 1})
        socket_client = self.app_module.socketio.test_client(self.app_module.app, flask_test_client=host_client)
        socket_client.emit("room:join", {"join_code": room["join_code"]})
        socket_client.get_received(); socket_client.emit("hand:start", {}); socket_client.get_received()
        table = self.app_module.tables[room["id"]]
        self.assertEqual(table.get_current_player().id, host["id"])
        self.assertFalse(table.clock_paused)

        with mock.patch.object(self.app_module.time, "time", return_value=1000):
            socket_client.disconnect()

        self.assertTrue(table.clock_paused)
        self.assertEqual(table.get_player(host["id"]).status, self.app_module.PlayerStatus.PLAYING)
        self.assertEqual(table.get_player(host["id"]).disconnected_at, 1000)

    def test_non_current_disconnect_keeps_seat_then_pauses_when_turn_reaches_it(self):
        host_client, host, room = self.create_room()
        guest_client, guest = self.guest_client("Guest")
        third_client, _third = self.guest_client("Third")
        guest_client.post(f"/api/v1/rooms/{room['join_code']}/join", json={"position": 1})
        third_client.post(f"/api/v1/rooms/{room['join_code']}/join", json={"position": 2})
        host_socket = self.app_module.socketio.test_client(self.app_module.app, flask_test_client=host_client)
        guest_socket = self.app_module.socketio.test_client(self.app_module.app, flask_test_client=guest_client)
        for client in (host_socket, guest_socket):
            client.emit("room:join", {"join_code": room["join_code"]}); client.get_received()
        host_socket.emit("hand:start", {}); host_socket.get_received(); guest_socket.get_received()
        table = self.app_module.tables[room["id"]]
        self.assertEqual(table.get_current_player().id, host["id"])
        positions = {row["player_id"]: row["position"] for row in self.app_module.db.get_table_players(room["id"])}

        with mock.patch.object(self.app_module.time, "time", return_value=1000):
            guest_socket.disconnect()
        self.assertFalse(table.clock_paused)
        self.assertEqual(table.get_player(guest["id"]).status, self.app_module.PlayerStatus.PLAYING)
        with mock.patch.object(self.app_module.time, "time", return_value=1001):
            host_socket.emit("player:act", {"action": "call", "turn_token": table.get_turn_token()})

        self.assertEqual(table.get_current_player().id, guest["id"])
        self.assertTrue(table.clock_paused)
        current_positions = {row["player_id"]: row["position"] for row in self.app_module.db.get_table_players(room["id"])}
        self.assertEqual(current_positions, positions)


if __name__ == "__main__":
    unittest.main()

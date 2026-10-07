import os
import sqlite3
import tempfile
import time
import unittest

from database import PokerDatabase


class PokerDatabaseCurrencyTests(unittest.TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.tempdir.name, "currency.db")

    def tearDown(self):
        self.tempdir.cleanup()

    def test_new_tables_default_to_cny_and_explicit_jpy_is_persisted(self):
        database = PokerDatabase(self.db_path)
        database.create_user("Host")
        host = database.get_user_by_nickname("Host")

        cny_id = database.create_table("CNY", host["id"])
        jpy_id = database.create_table("JPY", host["id"], currency="JPY")

        self.assertEqual(database.get_table(cny_id)["currency"], "CNY")
        self.assertEqual(database.get_table(jpy_id)["currency"], "JPY")

    def test_existing_tables_are_migrated_to_cny_idempotently(self):
        with sqlite3.connect(self.db_path) as connection:
            connection.execute("""
                CREATE TABLE tables (
                    id TEXT PRIMARY KEY, title TEXT NOT NULL,
                    small_blind INTEGER NOT NULL, big_blind INTEGER NOT NULL,
                    max_players INTEGER NOT NULL, initial_chips INTEGER NOT NULL,
                    game_mode TEXT NOT NULL DEFAULT 'blinds',
                    ante_percentage REAL DEFAULT 0.02,
                    game_stage TEXT NOT NULL DEFAULT 'waiting',
                    hand_number INTEGER DEFAULT 0, pot INTEGER DEFAULT 0,
                    current_bet INTEGER DEFAULT 0, current_player_id TEXT,
                    community_cards TEXT DEFAULT '[]',
                    created_by TEXT NOT NULL, created_at REAL NOT NULL,
                    last_activity REAL NOT NULL, is_active BOOLEAN DEFAULT 1,
                    room_mode TEXT NOT NULL DEFAULT 'private', bot_difficulty TEXT
                )
            """)
            connection.execute("""
                INSERT INTO tables (
                    id, title, small_blind, big_blind, max_players, initial_chips,
                    created_by, created_at, last_activity
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, ("legacy", "Legacy", 10, 20, 6, 1000, "host", time.time(), time.time()))

        PokerDatabase(self.db_path)
        database = PokerDatabase(self.db_path)

        self.assertEqual(database.get_table("legacy")["currency"], "CNY")
        with database.get_connection() as connection:
            currency_columns = [
                row["name"] for row in connection.execute("PRAGMA table_info(tables)")
                if row["name"] == "currency"
            ]
        self.assertEqual(currency_columns, ["currency"])

    def test_tournament_columns_migrate_idempotently(self):
        database = PokerDatabase(self.db_path)
        database = PokerDatabase(self.db_path)

        with database.get_connection() as connection:
            table_columns = {
                row["name"]: row for row in connection.execute("PRAGMA table_info(tables)")
            }
            player_columns = {
                row["name"]: row for row in connection.execute("PRAGMA table_info(table_players)")
            }

        self.assertEqual(table_columns["rebuy_limit"]["dflt_value"], "1")
        self.assertEqual(table_columns["blind_level_seconds"]["dflt_value"], "600")
        self.assertEqual(table_columns["tournament_elapsed_seconds"]["dflt_value"], "0")
        self.assertEqual(table_columns["blind_level"]["dflt_value"], "1")
        self.assertEqual(table_columns["clock_paused"]["dflt_value"], "1")
        self.assertEqual(player_columns["rebuys_used"]["dflt_value"], "0")
        self.assertEqual(player_columns["tournament_status"]["dflt_value"], "'active'")
        self.assertIn("disconnected_at", player_columns)

    def test_room_persists_finite_and_unlimited_rebuy_limits(self):
        database = PokerDatabase(self.db_path)
        host_id = database.create_user("Tournament Host")

        default_id = database.create_table("Default", host_id)
        finite_id = database.create_table("Finite", host_id, rebuy_limit=3)
        unlimited_id = database.create_table("Unlimited", host_id, rebuy_limit=None)

        self.assertEqual(database.get_table(default_id)["rebuy_limit"], 1)
        self.assertEqual(database.get_table(finite_id)["rebuy_limit"], 3)
        self.assertIsNone(database.get_table(unlimited_id)["rebuy_limit"])
        self.assertTrue(database.update_tournament_runtime(
            finite_id,
            elapsed_seconds=601.5,
            clock_anchor=1234.0,
            blind_level=2,
            clock_paused=False,
        ))
        runtime = database.get_table(finite_id)
        self.assertEqual(runtime["tournament_elapsed_seconds"], 601.5)
        self.assertEqual(runtime["tournament_clock_anchor"], 1234.0)
        self.assertEqual(runtime["blind_level"], 2)
        self.assertEqual(runtime["clock_paused"], 0)

    def test_table_player_persists_tournament_state(self):
        database = PokerDatabase(self.db_path)
        player_id = database.create_user("Player")
        table_id = database.create_table("Tournament", player_id)
        self.assertTrue(database.join_table(table_id, player_id, 0))

        initial = database.get_table_players(table_id)[0]
        self.assertEqual(initial["rebuys_used"], 0)
        self.assertEqual(initial["tournament_status"], "active")
        self.assertIsNone(initial["disconnected_at"])

        self.assertTrue(database.update_table_player_tournament_state(
            table_id,
            player_id,
            rebuys_used=2,
            tournament_status="spectating",
            disconnected_at=9876.0,
        ))
        updated = database.get_table_players(table_id)[0]
        self.assertEqual(updated["rebuys_used"], 2)
        self.assertEqual(updated["tournament_status"], "spectating")
        self.assertEqual(updated["disconnected_at"], 9876.0)


if __name__ == "__main__":
    unittest.main()

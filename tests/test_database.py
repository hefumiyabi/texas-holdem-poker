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


if __name__ == "__main__":
    unittest.main()

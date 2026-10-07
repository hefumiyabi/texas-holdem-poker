import unittest

from poker_engine.player import Player
from poker_engine.table import GameStage, Table


class BlindStructureTestCase(unittest.TestCase):
    def make_table(self, small=10, big=20):
        table = Table('blinds', 'Blind test', small, big, max_players=2, initial_chips=1_000_000)
        table.add_player(Player('p1', 'One', 1_000_000))
        table.add_player(Player('p2', 'Two', 1_000_000))
        return table

    def test_599_and_600_seconds_select_adjacent_levels(self):
        table = self.make_table()
        table.resume_tournament_clock(0)

        table.apply_blind_level_for_next_hand(599)
        self.assertEqual((table.blind_level, table.small_blind, table.big_blind), (1, 10, 20))
        table.apply_blind_level_for_next_hand(600)
        self.assertEqual((table.blind_level, table.small_blind, table.big_blind), (2, 15, 30))

    def test_due_level_applies_only_at_the_next_hand_boundary(self):
        table = self.make_table()
        table.resume_tournament_clock(0)
        self.assertTrue(table.start_new_hand(now=599))
        self.assertEqual((table.small_blind, table.big_blind), (10, 20))

        self.assertEqual(table.effective_tournament_seconds(600), 600)
        self.assertEqual((table.small_blind, table.big_blind), (10, 20))
        table.game_stage = GameStage.FINISHED
        self.assertTrue(table.start_new_hand(now=600))
        self.assertEqual((table.small_blind, table.big_blind), (15, 30))

    def test_approved_multiplier_sequence_repeats_by_power_of_ten(self):
        table = self.make_table()
        table.resume_tournament_clock(0)
        expected = [
            (10, 20), (15, 30), (20, 40), (30, 60), (40, 80), (50, 100), (75, 150),
            (100, 200), (150, 300),
        ]

        for index, blinds in enumerate(expected):
            table.apply_blind_level_for_next_hand(index * 600)
            self.assertEqual((table.small_blind, table.big_blind), blinds, index + 1)

    def test_odd_custom_blinds_use_half_up_integer_rounding(self):
        table = self.make_table(25, 51)
        table.resume_tournament_clock(0)

        table.apply_blind_level_for_next_hand(600)

        self.assertEqual((table.small_blind, table.big_blind), (38, 77))

    def test_pause_and_resume_crosses_boundary_without_counting_paused_time(self):
        table = self.make_table()
        table.resume_tournament_clock(0)
        table.pause_tournament_clock(599)
        self.assertEqual(table.effective_tournament_seconds(999), 599)

        table.resume_tournament_clock(1000)
        self.assertEqual(table.effective_tournament_seconds(1001), 600)
        table.apply_blind_level_for_next_hand(1001)
        self.assertEqual((table.blind_level, table.small_blind, table.big_blind), (2, 15, 30))


if __name__ == '__main__':
    unittest.main()

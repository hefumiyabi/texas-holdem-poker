import unittest

from poker_engine.player import Player
from poker_engine.table import Table


class BlindStructureTestCase(unittest.TestCase):
    def test_blinds_double_every_five_hands_and_only_change_between_hands(self):
        table = Table('blinds', 'Blind test', 10, 20, max_players=2)
        table.add_player(Player('p1', 'One', 10000))
        table.add_player(Player('p2', 'Two', 10000))

        for expected_hand in range(1, 6):
            self.assertTrue(table.start_new_hand())
            self.assertEqual(table.hand_number, expected_hand)
            self.assertEqual((table.small_blind, table.big_blind), (10, 20))
            table.game_stage = table.game_stage.FINISHED

        self.assertTrue(table.start_new_hand())
        self.assertEqual((table.small_blind, table.big_blind), (20, 40))
        state = table.get_table_state('p1')
        self.assertEqual(state['blind_level'], 2)
        self.assertEqual(state['hands_until_blind_increase'], 5)

    def test_original_blinds_remain_the_escalation_base(self):
        table = Table('blinds', 'Blind test', 25, 50, max_players=2)
        table.add_player(Player('p1', 'One', 10000))
        table.add_player(Player('p2', 'Two', 10000))
        table.hand_number = 10

        self.assertTrue(table.start_new_hand())
        self.assertEqual((table.small_blind, table.big_blind), (100, 200))


if __name__ == '__main__':
    unittest.main()

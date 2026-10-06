import unittest
from unittest import mock

from poker_engine.card import Card, Rank, Suit
from poker_engine.player import Player, PlayerStatus
from poker_engine.bot import Bot, BotLevel
from poker_engine.player import PlayerAction
from poker_engine.table import Table


DECK = [Card(suit, rank) for suit in Suit for rank in Rank]


def cards(text):
    suits = {'s': Suit.SPADES, 'h': Suit.HEARTS, 'd': Suit.DIAMONDS, 'c': Suit.CLUBS}
    ranks = {rank.symbol: rank for rank in Rank}
    ranks['T'] = Rank.TEN
    return [Card(suits[token[-1]], ranks[token[:-1]]) for token in text.split()]


class HandResultTestCase(unittest.TestCase):
    def table(self):
        table = Table('result', 'Result', 10, 20, max_players=2)
        players = [Player('p1', 'Hero', 1000), Player('p2', 'Villain', 1000)]
        for player in players:
            table.add_player(player)
            player.status = PlayerStatus.PLAYING
            player.total_bet = 50
        table.hand_players = players
        table.pot = 100
        return table, players

    def test_showdown_result_explains_winning_hand_and_reveals_only_contenders(self):
        table, players = self.table()
        players[0].hole_cards = cards('As Kd')
        players[1].hole_cards = cards('Ah Kc')
        table.community_cards = cards('Qs Jh Td 7c 8s')

        table._determine_winner()

        result = table.last_hand_result
        self.assertTrue(result['is_showdown'])
        self.assertEqual(len(result['winners']), 2)
        self.assertEqual(len(result['showdown_players']), 2)
        self.assertTrue(all(len(player['hole_cards']) == 2 for player in result['showdown_players']))
        self.assertTrue(all('顺子' in player['hand_description'] for player in result['showdown_players']))

    def test_fold_win_omits_mucked_cards_and_next_hand_clears_result(self):
        table, players = self.table()
        players[0].hole_cards = cards('As Ad')
        players[1].hole_cards = cards('Kh Kd')
        players[1].status = PlayerStatus.FOLDED

        table._determine_winner()

        self.assertFalse(table.last_hand_result['is_showdown'])
        self.assertEqual(table.last_hand_result['win_reason'], 'others_folded')
        self.assertEqual(table.last_hand_result['showdown_players'], [])
        self.assertNotIn('hole_cards', table.last_hand_result['winners'][0])
        self.assertTrue(table.start_new_hand())
        self.assertIsNone(table.last_hand_result)

    def test_fold_win_bot_log_does_not_dump_hidden_cards(self):
        table = Table('private-log', 'Private log', 10, 20, max_players=2)
        bots = [Bot('b1', 'One', 1000, BotLevel.BEGINNER), Bot('b2', 'Two', 1000, BotLevel.BEGINNER)]
        for bot in bots:
            table.add_player(bot)
        with mock.patch('builtins.print') as output, mock.patch.object(Bot, 'thinking_time', return_value=0):
            self.assertTrue(table.start_new_hand())
            current = table.get_current_player()
            current.decide_action = mock.Mock(return_value=(PlayerAction.FOLD, 0))
            result = table.process_bot_actions()

        rendered = ' '.join(str(call) for call in output.call_args_list)
        self.assertTrue(result['hand_complete'])
        self.assertNotIn('hole_cards', rendered)
        self.assertNotIn('showdown_players', rendered)


if __name__ == '__main__':
    unittest.main()

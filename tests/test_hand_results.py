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

    def settlement_table(self, stacks, bets, statuses=None):
        table = Table('settlement', 'Settlement', 10, 20, max_players=len(stacks))
        players = []
        for index, (starting, invested) in enumerate(zip(stacks, bets)):
            player = Player(f'p{index}', f'P{index}', starting - invested)
            table.add_player(player)
            # Table.add_player treats an initial zero stack as a fresh seat buy-in;
            # restore the deliberately all-in post-bet stack used by this fixture.
            player.chips = starting - invested
            player.status = (statuses or [PlayerStatus.PLAYING] * len(stacks))[index]
            player.total_bet = invested
            players.append(player)
        table.hand_players = players
        table.hand_start_stacks = {player.id: starting for player, starting in zip(players, stacks)}
        table.pot = sum(bets)
        return table, players

    def assert_balanced_results(self, result):
        self.assertEqual(sum(row['net'] for row in result['player_results']), 0)
        for row in result['player_results']:
            self.assertEqual(row['net'], row['final_chips'] - row['starting_chips'])
            self.assertEqual(row['payout'], row['final_chips'] - row['starting_chips'] + row['invested'])

    def test_ordinary_showdown_has_authoritative_net_rows(self):
        table, players = self.settlement_table([1000, 1000], [100, 100])
        players[0].hole_cards = cards('As Ad')
        players[1].hole_cards = cards('Ks Kd')
        table.community_cards = cards('2c 7h 9s 3d 4c')

        table._determine_winner()

        result = table.last_hand_result
        self.assert_balanced_results(result)
        self.assertEqual([row['net'] for row in result['player_results']], [100, -100])
        self.assertTrue(all(row['revealed'] for row in result['player_results']))

    def test_fold_win_counts_uncalled_return_without_revealing_mucked_cards(self):
        table, players = self.settlement_table(
            [1000, 1000], [300, 100], [PlayerStatus.PLAYING, PlayerStatus.FOLDED]
        )
        players[0].hole_cards = cards('As Ad')
        players[1].hole_cards = cards('Ks Kd')

        table._determine_winner()

        result = table.last_hand_result
        self.assert_balanced_results(result)
        rows = {row['player_id']: row for row in result['player_results']}
        self.assertEqual(rows['p0']['payout'], 400)
        self.assertEqual(rows['p0']['net'], 100)
        self.assertEqual(rows['p1']['net'], -100)
        self.assertFalse(rows['p1']['revealed'])
        self.assertNotIn('hole_cards', rows['p1'])
        self.assertEqual(len(result['player_results']), 2)

    def test_split_pot_with_folded_dead_money_balances_every_player(self):
        table, players = self.settlement_table(
            [1000, 1000, 1000], [35, 35, 10],
            [PlayerStatus.PLAYING, PlayerStatus.PLAYING, PlayerStatus.FOLDED],
        )
        players[0].hole_cards = cards('As Kd')
        players[1].hole_cards = cards('Ah Kc')
        players[2].hole_cards = cards('2c 3d')
        table.community_cards = cards('Qs Jh Td 7c 8s')

        table._determine_winner()

        result = table.last_hand_result
        self.assert_balanced_results(result)
        self.assertEqual([row['net'] for row in result['player_results']], [5, 5, -10])
        folded = next(row for row in result['player_results'] if row['player_id'] == 'p2')
        self.assertFalse(folded['revealed'])
        self.assertNotIn('hole_cards', folded)

    def test_multi_side_pot_rows_balance_from_actual_final_stacks(self):
        table, players = self.settlement_table([100, 1000, 1000], [100, 400, 400])
        players[0].hole_cards = cards('As Ad')
        players[1].hole_cards = cards('Ks Kd')
        players[2].hole_cards = cards('Qs Qd')
        table.community_cards = cards('2c 7h 9s 3d 4c')

        table._determine_winner()

        result = table.last_hand_result
        self.assert_balanced_results(result)
        self.assertEqual([row['net'] for row in result['player_results']], [200, 200, -400])
        self.assertEqual([row['payout'] for row in result['player_results']], [300, 600, 0])

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

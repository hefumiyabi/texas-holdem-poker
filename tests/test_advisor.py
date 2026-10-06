import unittest
from unittest.mock import patch

from poker_engine.card import Card, Rank, Suit


def cards(*items):
    suit_map = {'s': Suit.SPADES, 'h': Suit.HEARTS, 'd': Suit.DIAMONDS, 'c': Suit.CLUBS}
    rank_map = {rank.symbol: rank for rank in Rank}
    return [Card(suit_map[item[-1]], rank_map[item[:-1]]) for item in items]


class AdvisorTestCase(unittest.TestCase):
    def advice(self, equity, **overrides):
        from poker_engine.advisor import calculate_advice

        values = dict(
            hole_cards=cards('As', 'Kh'), community_cards=cards('Qh', '7d', '2c'),
            active_opponents=2, pot=100, current_bet=40, player_bet=20,
            min_raise_to=80, simulations=1500,
        )
        values.update(overrides)
        with patch('poker_engine.advisor.equity_vs_random', return_value={'equity': equity}):
            return calculate_advice(**values)

    def test_calculates_pot_odds_and_recommends_fold_call_or_raise(self):
        self.assertEqual(self.advice(0.10)['recommended_action'], 'fold')
        self.assertEqual(self.advice(0.25)['recommended_action'], 'call')
        self.assertEqual(self.advice(0.70)['recommended_action'], 'raise')
        self.assertAlmostEqual(self.advice(0.25)['pot_odds'], 20 / 120)

    def test_zero_call_never_divides_and_recommends_check_or_bet(self):
        passive = self.advice(0.40, current_bet=20, player_bet=20)
        value = self.advice(0.70, current_bet=20, player_bet=20)
        self.assertEqual(passive['pot_odds'], 0)
        self.assertEqual(passive['recommended_action'], 'check')
        self.assertEqual(value['recommended_action'], 'raise')

    def test_uses_only_public_opponent_count_and_requested_sample_size(self):
        from poker_engine.advisor import calculate_advice

        with patch('poker_engine.advisor.equity_vs_random', return_value={'equity': 0.5}) as equity:
            result = calculate_advice(
                cards('As', 'Ah'), cards('Kd', '7c', '3h'), 3,
                pot=200, current_bet=0, player_bet=0, min_raise_to=20,
            )
        args, kwargs = equity.call_args
        self.assertEqual(args[2], 3)
        self.assertEqual(args[3], 1500)
        self.assertNotIn('opponent_holes', kwargs)
        self.assertEqual(result['sample_size'], 1500)

    def test_visible_state_produces_reproducible_bounded_equity(self):
        from poker_engine.advisor import calculate_advice

        values = dict(
            hole_cards=cards('Qs', 'Qh'), community_cards=cards('Kd', '7c', '3h'),
            active_opponents=2, pot=140, current_bet=40, player_bet=20,
            min_raise_to=80, simulations=200,
        )
        first = calculate_advice(**values)
        second = calculate_advice(**values)
        self.assertEqual(first, second)
        self.assertGreaterEqual(first['equity'], 0)
        self.assertLessEqual(first['equity'], 1)


if __name__ == '__main__':
    unittest.main()

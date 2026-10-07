import contextlib
import io
import unittest
from unittest import mock

from poker_engine.bot import Bot, BotLevel
from poker_engine.player import Player, PlayerAction
from poker_engine.table import GameStage, Table


class TurnOrderTestCase(unittest.TestCase):
    def make_table(self, players):
        table = Table("turns", "Turn order", small_blind=10, big_blind=20, max_players=len(players))
        with contextlib.redirect_stdout(io.StringIO()):
            for player in players:
                self.assertTrue(table.add_player(player))
            self.assertTrue(table.start_new_hand())
        return table

    def act(self, table, action, amount=0):
        player = table.get_current_player()
        self.assertIsNotNone(player)
        with contextlib.redirect_stdout(io.StringIO()):
            result = table.process_player_action(player.id, action, amount)
        self.assertTrue(result["success"], result)
        return player

    def test_heads_up_preflop_and_postflop_order(self):
        dealer = Player("p0", "Dealer", 1000)
        big_blind = Player("p1", "Big blind", 1000)
        table = self.make_table([dealer, big_blind])

        self.assertIs(table.get_current_player(), dealer)
        self.act(table, PlayerAction.CALL)
        self.act(table, PlayerAction.CHECK)

        self.assertEqual(table.game_stage, GameStage.FLOP)
        self.assertIs(table.get_current_player(), big_blind)

    def test_multi_seat_preflop_and_postflop_order(self):
        players = [Player(f"p{i}", f"P{i}", 1000) for i in range(4)]
        table = self.make_table(players)

        self.assertIs(table.get_current_player(), players[3])
        observed = [self.act(table, PlayerAction.CALL).id for _ in range(3)]
        observed.append(self.act(table, PlayerAction.CHECK).id)

        self.assertEqual(observed, ["p3", "p0", "p1", "p2"])
        self.assertEqual(table.game_stage, GameStage.FLOP)
        self.assertIs(table.get_current_player(), players[1])

    def test_human_turn_blocks_all_later_bots(self):
        human = Player("human", "Human", 1000)
        bots = [Bot(f"bot{i}", f"Bot {i}", 1000, BotLevel.BEGINNER) for i in range(2)]
        table = self.make_table([human, *bots])
        before = (table.pot, [player.chips for player in table.players], table.action_revision)

        result = table.process_one_bot_action(table.get_turn_token())

        self.assertFalse(result["success"])
        self.assertEqual(result["code"], "human_turn")
        self.assertEqual((table.pot, [player.chips for player in table.players], table.action_revision), before)

    def test_stale_bot_turn_token_cannot_mutate_table(self):
        bot = Bot("bot", "Bot", 1000, BotLevel.BEGINNER)
        human = Player("human", "Human", 1000)
        table = self.make_table([bot, human])
        stale_token = table.get_turn_token()
        table.action_revision += 1
        before = (table.pot, table.current_bet, bot.chips, bot.current_bet, bot.has_acted, table.action_revision)

        with mock.patch.object(bot, "decide_action", return_value=(PlayerAction.CALL, 0)) as decide:
            result = table.process_one_bot_action(stale_token)

        self.assertFalse(result["success"])
        self.assertTrue(result["stale_turn"])
        self.assertEqual((table.pot, table.current_bet, bot.chips, bot.current_bet, bot.has_acted, table.action_revision), before)
        decide.assert_not_called()


if __name__ == "__main__":
    unittest.main()

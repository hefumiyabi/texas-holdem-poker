import random

import pytest

from poker_engine.bot import Bot, BotLevel
from poker_engine.card import Card, Rank, Suit
from poker_engine.player import PlayerAction, PlayerStatus
from poker_engine.player import Player
from poker_engine.bot_profiles import BotPersona, get_bot_profile
from poker_engine.table import Table


def make_bot(persona=BotPersona.BALANCED, seed=7, level=BotLevel.INTERMEDIATE):
    bot = Bot("bot", "Test Bot", 1000, level, persona=persona, rng=random.Random(seed))
    bot.status = PlayerStatus.PLAYING
    bot.hole_cards = [Card(Suit.SPADES, Rank.KING), Card(Suit.HEARTS, Rank.NINE)]
    return bot


def test_profiles_cover_five_distinct_human_play_styles():
    profiles = {persona: get_bot_profile(persona) for persona in BotPersona}

    assert set(profiles) == {
        BotPersona.BALANCED,
        BotPersona.AGGRESSIVE,
        BotPersona.TIGHT,
        BotPersona.CALLER,
        BotPersona.TRICKY,
    }
    assert profiles[BotPersona.AGGRESSIVE].aggression > profiles[BotPersona.TIGHT].aggression
    assert profiles[BotPersona.CALLER].preflop_looseness > profiles[BotPersona.TIGHT].preflop_looseness
    assert profiles[BotPersona.TRICKY].slow_play > profiles[BotPersona.BALANCED].slow_play
    assert profiles[BotPersona.AGGRESSIVE].bluff_frequency > profiles[BotPersona.CALLER].bluff_frequency
    assert get_bot_profile("tight") is profiles[BotPersona.TIGHT]
    with pytest.raises(ValueError):
        get_bot_profile("unknown")


def test_bot_serialization_exposes_identity_not_strategy_or_hidden_cards():
    bot = make_bot(BotPersona.TRICKY)

    payload = bot.to_dict()

    assert payload["bot_level"] == "intermediate"
    assert payload["bot_persona"] == "tricky"
    assert payload["persona_label"] == "读牌快"
    assert "hole_cards" not in payload
    assert "bluff_frequency" not in payload
    assert "strategy" not in payload


def test_seeded_mixed_strategy_is_reproducible():
    first = make_bot(BotPersona.BALANCED, seed=19, level=BotLevel.BEGINNER)
    second = make_bot(BotPersona.BALANCED, seed=19, level=BotLevel.BEGINNER)
    first._evaluate_preflop_hand = lambda: 0.3
    second._evaluate_preflop_hand = lambda: 0.3
    state = {"community_cards": [], "current_bet": 20, "pot_size": 50, "big_blind": 20}

    first_actions = [first.decide_action(state) for _ in range(12)]
    second_actions = [second.decide_action(state) for _ in range(12)]

    assert first_actions == second_actions
    assert {action for action, _ in first_actions} <= {PlayerAction.CALL, PlayerAction.FOLD}


def test_persona_changes_mixed_bluff_frequency_without_forcing_actions():
    aggressive = make_bot(BotPersona.AGGRESSIVE, seed=23)
    caller = make_bot(BotPersona.CALLER, seed=23)

    aggressive_bluffs = sum(aggressive._mix(0.18, "bluff") for _ in range(500))
    caller_bluffs = sum(caller._mix(0.18, "bluff") for _ in range(500))

    assert aggressive_bluffs > caller_bluffs + 30
    assert 0 < caller_bluffs < aggressive_bluffs < 500


def test_public_levels_exclude_hidden_card_god_mode():
    assert BotLevel.BEGINNER.is_public
    assert BotLevel.INTERMEDIATE.is_public
    assert BotLevel.ADVANCED.is_public
    assert not BotLevel.GOD.is_public


def test_bot_action_logs_never_print_hidden_cards(monkeypatch, capsys):
    monkeypatch.setattr("poker_engine.table.time.sleep", lambda _seconds: None)
    table = Table("privacy", "Privacy", 10, 20, 2, 1000)
    table.add_player(make_bot(BotPersona.BALANCED, seed=2))
    table.add_player(Bot("bot-2", "Other Bot", 1000, BotLevel.INTERMEDIATE,
                         persona=BotPersona.TIGHT, rng=random.Random(3)))
    table.start_new_hand()

    table.process_bot_actions()

    assert "手牌:" not in capsys.readouterr().out


def test_public_bot_state_cannot_access_opponent_hole_cards():
    table = Table("fair", "Fair", 10, 20, 2, 1000)
    human = Player("human", "Human", 1000)
    human.status = PlayerStatus.PLAYING
    human.hole_cards = [Card(Suit.SPADES, Rank.ACE), Card(Suit.HEARTS, Rank.ACE)]
    bot = make_bot(BotPersona.BALANCED, level=BotLevel.ADVANCED)
    table.add_player(human)
    table.add_player(bot)

    opponents = table._bot_game_state(bot)["all_players"]

    public_human = next(player for player in opponents if player.id == human.id)
    assert not hasattr(public_human, "hole_cards")


def test_seeded_postflop_strategy_is_reproducible():
    state = {
        "community_cards": [
            Card(Suit.SPADES, Rank.KING), Card(Suit.HEARTS, Rank.NINE),
            Card(Suit.CLUBS, Rank.TWO),
        ],
        "current_bet": 0, "to_call": 0, "pot_size": 300,
        "big_blind": 20, "min_bet": 20, "min_raise_to": 40,
        "active_players": 2, "num_opponents": 1, "position": "late",
        "all_players": [],
    }
    actions = []
    for _ in range(3):
        bot = Bot("bot", "Seeded", 1000, BotLevel.ADVANCED,
                  persona=BotPersona.BALANCED, rng=random.Random(7))
        bot.status = PlayerStatus.PLAYING
        bot.hole_cards = [Card(Suit.HEARTS, Rank.QUEEN), Card(Suit.DIAMONDS, Rank.NINE)]
        actions.append(bot.decide_action(state))

    assert actions[0] == actions[1] == actions[2]


@pytest.mark.parametrize(
    ("state", "expected_actions"),
    [
        (
            {"current_bet": 0, "min_bet": 20, "min_raise_to": 40, "big_blind": 20},
            {PlayerAction.BET, PlayerAction.ALL_IN},
        ),
        (
            {"current_bet": 40, "min_bet": 20, "min_raise_to": 80, "big_blind": 20},
            {PlayerAction.RAISE, PlayerAction.ALL_IN},
        ),
    ],
)
def test_personality_sizing_stays_inside_legal_bet_boundaries(state, expected_actions):
    bot = make_bot(BotPersona.AGGRESSIVE)
    action, amount = bot._sized_bet(state, 60)

    assert action in expected_actions
    assert 0 < amount <= bot.chips
    if action == PlayerAction.RAISE:
        assert amount >= state["min_raise_to"]
    if action == PlayerAction.BET:
        assert amount >= state["min_bet"]

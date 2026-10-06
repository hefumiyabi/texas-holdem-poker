"""Fair, public-information-only decision guidance for practice tables."""

import hashlib
import random
from typing import Dict, Sequence

from .card import Card
from .equity import equity_vs_random


def _visible_state_rng(hole_cards: Sequence[Card], community_cards: Sequence[Card],
                       active_opponents: int) -> random.Random:
    visible = '|'.join([*(str(card) for card in hole_cards), '-',
                        *(str(card) for card in community_cards), str(active_opponents)])
    seed = int.from_bytes(hashlib.sha256(visible.encode('utf-8')).digest()[:8], 'big')
    return random.Random(seed)


def calculate_advice(hole_cards: Sequence[Card], community_cards: Sequence[Card],
                     active_opponents: int, pot: int, current_bet: int,
                     player_bet: int, min_raise_to: int,
                     simulations: int = 1500) -> Dict:
    """Estimate equity and give a transparent action using only visible state."""
    sample_size = max(100, min(int(simulations), 5000))
    opponents = max(1, int(active_opponents))
    result = equity_vs_random(
        hole_cards, community_cards, opponents, sample_size,
        rng=_visible_state_rng(hole_cards, community_cards, opponents),
    )
    equity = max(0.0, min(1.0, float(result.get('equity', 0))))
    call_amount = max(0, int(current_bet) - int(player_bet))
    pot_after_call = max(0, int(pot)) + call_amount
    pot_odds = call_amount / pot_after_call if call_amount and pot_after_call else 0.0
    pot_odds = max(0.0, min(1.0, pot_odds))

    if call_amount == 0:
        if equity >= 0.58:
            action, reason = 'raise', 'value_advantage'
        else:
            action, reason = 'check', 'free_card'
    elif equity + 0.03 < pot_odds:
        action, reason = 'fold', 'price_too_high'
    elif equity >= max(0.58, pot_odds + 0.15):
        action, reason = 'raise', 'value_advantage'
    else:
        action, reason = 'call', 'priced_to_continue'

    return {
        'equity': equity,
        'pot_odds': pot_odds,
        'recommended_action': action,
        'reason': reason,
        'sample_size': sample_size,
    }

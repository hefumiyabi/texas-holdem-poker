"""Human-readable bot personalities layered on top of skill levels."""

from dataclasses import dataclass
from enum import Enum
from typing import Union


class BotPersona(Enum):
    BALANCED = "balanced"
    AGGRESSIVE = "aggressive"
    TIGHT = "tight"
    CALLER = "caller"
    TRICKY = "tricky"


@dataclass(frozen=True)
class BotProfile:
    persona: BotPersona
    nickname: str
    label: str
    preflop_looseness: float
    aggression: float
    bluff_frequency: float
    slow_play: float
    sizing: float


_PROFILES = {
    BotPersona.BALANCED: BotProfile(BotPersona.BALANCED, "理性哥", "稳健型", 0.00, 1.00, 1.00, 0.10, 1.00),
    BotPersona.AGGRESSIVE: BotProfile(BotPersona.AGGRESSIVE, "深海鱼", "爱诈唬", 0.04, 1.35, 1.55, 0.05, 1.15),
    BotPersona.TIGHT: BotProfile(BotPersona.TIGHT, "冷静先生", "很谨慎", -0.06, 0.75, 0.65, 0.08, 0.90),
    BotPersona.CALLER: BotProfile(BotPersona.CALLER, "小雨", "喜欢跟注", 0.08, 0.65, 0.45, 0.04, 0.85),
    BotPersona.TRICKY: BotProfile(BotPersona.TRICKY, "玫瑰", "读牌快", 0.02, 1.10, 1.20, 0.28, 1.10),
}


def get_bot_profile(persona: Union[BotPersona, str]) -> BotProfile:
    try:
        key = persona if isinstance(persona, BotPersona) else BotPersona(str(persona).lower())
    except (TypeError, ValueError) as exc:
        raise ValueError("invalid bot persona") from exc
    return _PROFILES[key]

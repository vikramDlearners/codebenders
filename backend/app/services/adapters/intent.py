"""Intent parsing for voice and text replies from parent mode.

Offline mode uses keyword rules (English plus basic Tamil and Hindi).
The online LLM parser is a stub in Phase 1 and raises NotImplementedError.
"""

import re
from dataclasses import dataclass
from typing import Protocol

CONFIRM_TAKEN = "CONFIRM_TAKEN"
REMIND_LATER = "REMIND_LATER"
NOT_TAKEN_YET = "NOT_TAKEN_YET"
MEDICINE_UNAVAILABLE = "MEDICINE_UNAVAILABLE"
NEED_HELP = "NEED_HELP"
UNKNOWN = "UNKNOWN"
CANCEL = "CANCEL"

INTENTS: tuple[str, ...] = (
    CONFIRM_TAKEN,
    REMIND_LATER,
    NOT_TAKEN_YET,
    MEDICINE_UNAVAILABLE,
    NEED_HELP,
    UNKNOWN,
    CANCEL,
)

ALLOWED_DELAY_MINUTES: frozenset[int] = frozenset({5, 10, 15, 20, 25, 30})


@dataclass(frozen=True)
class IntentResult:
    intent: str
    delay_minutes: int | None = None
    source: str = "rules"  # "rules" or "llm"


_DELAY_RE = re.compile(r"\b(\d{1,2})\s*(?:minutes?|mins?|min)\b", re.IGNORECASE)

# Order matters: checked top to bottom, first match wins.
# NOT_TAKEN_YET must be checked before CONFIRM_TAKEN, because "not taken yet"
# contains "taken".
_KEYWORDS: tuple[tuple[str, tuple[str, ...]], ...] = (
    (CANCEL, ("cancel", "never mind", "stop", "வேண்டாம்", "रद्द")),
    (NEED_HELP, ("help", "emergency", "sos", "call someone", "உதவி", "मदद")),
    (MEDICINE_UNAVAILABLE, ("ran out", "out of medicine", "no medicine", "finished", "இல்லை", "खत्म")),
    (
        NOT_TAKEN_YET,
        ("not taken", "not yet", "not now", "haven't taken", "have not taken", "சாப்பிடவில்லை", "இன்னும்", "नहीं लिया", "अभी नहीं"),
    ),
    (REMIND_LATER, ("remind", "later", "in a while", "after some time", "பிறகு", "बाद में", "याद दिलाओ")),
    (
        CONFIRM_TAKEN,
        ("taken", "took", "done", "yes", "i ate", "சாப்பிட்டேன்", "எடுத்துக்கொண்டேன்", "ले लिया", "खा लिया", "हाँ"),
    ),
)


class IntentParser(Protocol):
    def parse(self, text: str) -> IntentResult: ...


class RuleBasedIntentParser:
    def parse(self, text: str) -> IntentResult:
        normalised = (text or "").strip().lower()
        if not normalised:
            return IntentResult(UNKNOWN)

        for intent, keywords in _KEYWORDS:
            if any(keyword in normalised for keyword in keywords):
                delay = None
                if intent == REMIND_LATER:
                    delay = self._extract_delay(normalised)
                return IntentResult(intent, delay_minutes=delay)
        return IntentResult(UNKNOWN)

    @staticmethod
    def _extract_delay(text: str) -> int | None:
        match = _DELAY_RE.search(text)
        if not match:
            return None
        minutes = int(match.group(1))
        return minutes if minutes in ALLOWED_DELAY_MINUTES else None


class GeminiIntentParser:
    """Interface stub for the online LLM parser. No live calls in Phase 1."""

    def parse(self, text: str) -> IntentResult:
        raise NotImplementedError("Gemini intent parsing is not implemented in Phase 1")


OFFLINE_RULES = "offline_rules"
ONLINE_LLM = "online_llm"


def get_intent_parser(mode: str) -> IntentParser:
    if mode == OFFLINE_RULES:
        return RuleBasedIntentParser()
    if mode == ONLINE_LLM:
        return GeminiIntentParser()
    raise ValueError(f"Unknown intent mode: {mode}")

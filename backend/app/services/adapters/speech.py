"""Speech-to-text and text-to-speech interfaces.

ElevenLabs classes are stubs in Phase 1. They define the interface and raise
NotImplementedError. No API key is read or sent.
"""

from typing import Protocol


class SpeechToText(Protocol):
    def transcribe(self, audio: bytes, language: str) -> str: ...


class TextToSpeech(Protocol):
    def synthesize(self, text: str, language: str) -> bytes: ...


class ElevenLabsSpeechToText:
    def transcribe(self, audio: bytes, language: str) -> str:
        raise NotImplementedError("ElevenLabs speech-to-text is not implemented in Phase 1")


class ElevenLabsTextToSpeech:
    def synthesize(self, text: str, language: str) -> bytes:
        raise NotImplementedError("ElevenLabs text-to-speech is not implemented in Phase 1")

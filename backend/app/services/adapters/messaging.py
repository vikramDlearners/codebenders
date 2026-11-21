"""Email and SMS providers.

Phase 1 uses logging implementations that record every message in an
in-memory outbox instead of sending it. Real SMTP or SMS gateways can be
plugged in later behind the same protocols. Mock is the default.
"""

import logging
from dataclasses import dataclass, field
from typing import Protocol

from app.core.config import settings

logger = logging.getLogger("carecircle.messaging")


@dataclass
class OutboundMessage:
    channel: str  # "email" or "sms"
    to: str
    subject: str | None
    body: str


class EmailProvider(Protocol):
    def send(self, to: str, subject: str, body: str) -> None: ...


class SmsProvider(Protocol):
    def send(self, to: str, body: str) -> None: ...


@dataclass
class LoggingEmailProvider:
    outbox: list[OutboundMessage] = field(default_factory=list)

    def send(self, to: str, subject: str, body: str) -> None:
        self.outbox.append(OutboundMessage("email", to, subject, body))
        logger.info("MOCK EMAIL to=%s subject=%s", to, subject)


@dataclass
class LoggingSmsProvider:
    outbox: list[OutboundMessage] = field(default_factory=list)

    def send(self, to: str, body: str) -> None:
        self.outbox.append(OutboundMessage("sms", to, None, body))
        logger.info("MOCK SMS to=%s", to)


_email_provider: EmailProvider = LoggingEmailProvider()
_sms_provider: SmsProvider = LoggingSmsProvider()


def get_email_provider() -> EmailProvider:
    # Only the logging/mock implementation exists in Phase 1, regardless of SMTP settings.
    return _email_provider


def get_sms_provider() -> SmsProvider:
    # settings.sms_provider is "mock" by default; any other value is not implemented yet.
    if settings.sms_provider != "mock":
        raise NotImplementedError(f"SMS provider '{settings.sms_provider}' is not implemented in Phase 1")
    return _sms_provider

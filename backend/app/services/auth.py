"""Passwordless sign-in: one-time link by email, then a signed session token.

Dev-grade: the session token is HMAC(secret_key, user_id). Replace with a proper
session store or JWT before any real deployment.
"""

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.login_token import LoginToken
from app.models.user import User
from app.services.adapters.messaging import get_email_provider
from app.services.errors import AuthError


def _as_utc(value: datetime) -> datetime:
    # SQLite returns naive datetimes even for timezone=True columns.
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def request_sign_in_link(db: Session, email: str, display_name: str | None = None) -> None:
    """Create a one-time link and send it through the email provider (mock by default).

    A new email needs a display_name to create the account.
    """
    email = email.strip().lower()
    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if user is None:
        if not display_name or not display_name.strip():
            raise ValueError("display_name is required to create a new account")
        user = User(email=email, display_name=display_name.strip())
        db.add(user)
        db.flush()

    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.login_token_minutes)
    db.add(LoginToken(user_id=user.id, token_hash=_hash_token(token), expires_at=expires))
    db.commit()

    link = f"{settings.login_link_base_url}?token={token}"
    get_email_provider().send(
        email,
        "Your CareCircle sign-in link",
        f"Open this link within {settings.login_token_minutes} minutes to sign in: {link}",
    )


def verify_sign_in_token(db: Session, token: str) -> User:
    row = db.execute(
        select(LoginToken).where(LoginToken.token_hash == _hash_token(token))
    ).scalar_one_or_none()
    now = datetime.now(timezone.utc)
    if row is None or row.used_at is not None or _as_utc(row.expires_at) < now:
        raise AuthError("Sign-in link is invalid, expired or already used")
    row.used_at = now
    db.commit()
    user = db.get(User, row.user_id)
    if user is None or user.status != "active":
        raise AuthError("Account is not active")
    return user


def issue_session_token(user_id: str) -> str:
    sig = hmac.new(settings.secret_key.encode("utf-8"), user_id.encode("utf-8"), hashlib.sha256)
    return f"{user_id}.{sig.hexdigest()}"


def user_from_session_token(db: Session, token: str) -> User | None:
    user_id, _, sig = token.rpartition(".")
    if not user_id:
        return None
    expected = issue_session_token(user_id).rpartition(".")[2]
    if not hmac.compare_digest(sig, expected):
        return None
    user = db.get(User, user_id)
    return user if user and user.status == "active" else None

"""Shared FastAPI dependencies: database session and the signed-in user."""

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.user import User
from app.services.auth import user_from_session_token


def current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sign in required")
    user = user_from_session_token(db, authorization[7:].strip())
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session is invalid")
    return user


DbSession = Depends(get_db)
CurrentUser = Depends(current_user)

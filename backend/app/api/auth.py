"""Sign-in by one-time email link, then a session token."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, DbSession
from app.models.user import User
from app.schemas import SessionOut, SignInRequest, UserOut, VerifyRequest
from app.services.auth import issue_session_token, request_sign_in_link, verify_sign_in_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/request-link", status_code=202)
def request_link(body: SignInRequest, db: Session = DbSession) -> dict:
    # Same response whether or not the account exists, so emails cannot be probed.
    request_sign_in_link(db, body.email, body.display_name)
    return {"detail": "If this email can sign in, a link has been sent."}


@router.post("/verify", response_model=SessionOut)
def verify(body: VerifyRequest, db: Session = DbSession) -> SessionOut:
    user = verify_sign_in_token(db, body.token)
    return SessionOut(
        session_token=issue_session_token(user.id),
        user=UserOut(id=user.id, email=user.email, display_name=user.display_name),
    )


@router.get("/me", response_model=UserOut)
def me(user: User = CurrentUser) -> UserOut:
    return UserOut(id=user.id, email=user.email, display_name=user.display_name)

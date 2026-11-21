"""Family-level app settings. Reading needs an active membership; changing the intent mode needs roles.manage."""

from fastapi import APIRouter
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, DbSession
from app.models.user import User
from app.schemas import IntentModeOut, IntentModeUpdate
from app.services import app_settings as svc
from app.services.permissions import get_membership

router = APIRouter(prefix="/api/families/{family_id}/settings", tags=["settings"])


@router.get("/intent-mode", response_model=IntentModeOut)
def get_intent_mode(family_id: str, db: Session = DbSession, user: User = CurrentUser) -> IntentModeOut:
    get_membership(db, user.id, family_id)
    return IntentModeOut(intent_mode=svc.get_intent_mode(db))


@router.put("/intent-mode", response_model=IntentModeOut)
def set_intent_mode(
    family_id: str, body: IntentModeUpdate, db: Session = DbSession, user: User = CurrentUser
) -> IntentModeOut:
    return IntentModeOut(intent_mode=svc.set_intent_mode(db, user.id, family_id, body.intent_mode))

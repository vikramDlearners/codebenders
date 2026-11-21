"""Family activity timeline. Viewing needs activity.view."""

from fastapi import APIRouter
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, DbSession
from app.models.user import User
from app.schemas import ActivityOut
from app.services import activity as svc
from app.services.permissions import require

router = APIRouter(prefix="/api/families/{family_id}/activity", tags=["activity"])


@router.get("", response_model=list[ActivityOut])
def list_activity(family_id: str, db: Session = DbSession, user: User = CurrentUser) -> list[ActivityOut]:
    require(db, user.id, family_id, "activity.view")
    return [
        ActivityOut(
            id=row.id,
            actor_id=row.actor_id,
            action=row.action,
            object_type=row.object_type,
            object_id=row.object_id,
            metadata=row.metadata_json,
            created_at=row.created_at,
        )
        for row in svc.list_activity(db, family_id)
    ]

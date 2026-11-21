"""Append-only activity log. Every state-changing service call writes one row."""

from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.activity import ActivityLog


def log_activity(
    db: Session,
    family_id: str,
    actor_id: str | None,
    action: str,
    object_type: str,
    object_id: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> ActivityLog:
    """Stage an activity row. The caller commits together with the change."""
    row = ActivityLog(
        family_id=family_id,
        actor_id=actor_id,
        action=action,
        object_type=object_type,
        object_id=object_id,
        metadata_json=metadata,
    )
    db.add(row)
    return row


def list_activity(db: Session, family_id: str, limit: int = 100) -> list[ActivityLog]:
    stmt = (
        select(ActivityLog)
        .where(ActivityLog.family_id == family_id)
        .order_by(ActivityLog.created_at.desc())
        .limit(limit)
    )
    return list(db.execute(stmt).scalars())

"""In-app notifications. Stage with notify(); the caller commits."""

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.services.errors import NotFound


def notify(
    db: Session,
    recipient_user_id: str,
    type_: str,
    family_id: str | None = None,
    payload: dict[str, Any] | None = None,
) -> Notification:
    row = Notification(
        recipient_user_id=recipient_user_id,
        family_id=family_id,
        type=type_,
        payload=payload,
        status="unread",
    )
    db.add(row)
    return row


def list_for_user(db: Session, user_id: str, limit: int = 100) -> list[Notification]:
    stmt = (
        select(Notification)
        .where(Notification.recipient_user_id == user_id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
    )
    return list(db.execute(stmt).scalars())


def mark_read(db: Session, user_id: str, notification_id: str) -> Notification:
    row = db.get(Notification, notification_id)
    if row is None or row.recipient_user_id != user_id:
        raise NotFound("Notification not found")
    if row.status != "read":
        row.status = "read"
        row.read_at = datetime.now(timezone.utc)
        db.commit()
    return row

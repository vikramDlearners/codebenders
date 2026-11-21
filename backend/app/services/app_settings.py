"""Intent-mode setting (offline_rules or online_llm). Changing it needs roles.manage."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.app_setting import AppSetting
from app.services.activity import log_activity
from app.services.adapters.intent import OFFLINE_RULES, ONLINE_LLM
from app.services.permissions import require

INTENT_MODE_KEY = "intent_mode"
ALLOWED_INTENT_MODES = (OFFLINE_RULES, ONLINE_LLM)


def get_intent_mode(db: Session) -> str:
    row = db.execute(select(AppSetting).where(AppSetting.key == INTENT_MODE_KEY)).scalar_one_or_none()
    return row.value if row else settings.intent_mode


def set_intent_mode(db: Session, actor_id: str, family_id: str, mode: str) -> str:
    require(db, actor_id, family_id, "roles.manage")
    if mode not in ALLOWED_INTENT_MODES:
        raise ValueError(f"intent_mode must be one of {', '.join(ALLOWED_INTENT_MODES)}")
    row = db.get(AppSetting, INTENT_MODE_KEY)
    if row is None:
        db.add(AppSetting(key=INTENT_MODE_KEY, value=mode))
    else:
        row.value = mode
    log_activity(db, family_id, actor_id, "settings.intent_mode_changed", "setting", INTENT_MODE_KEY, {"mode": mode})
    db.commit()
    return mode

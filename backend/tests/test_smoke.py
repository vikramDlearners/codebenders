"""Smoke tests: app boots, health endpoint responds, key modules and models load."""

import app.api.roles  # noqa: F401  import must succeed
from app.core.db import Base
from app.models import (
    ActivityLog,
    AppSetting,
    CareProfile,
    Family,
    FamilyMember,
    LoginToken,
    Medicine,
    Notification,
    Role,
    RolePermission,
    Task,
    User,
)
from app.services.adapters.intent import (
    MEDICINE_UNAVAILABLE,
    IntentResult,
    get_intent_parser,
)

MODELS = [
    User,
    LoginToken,
    Family,
    Role,
    RolePermission,
    FamilyMember,
    CareProfile,
    Medicine,
    Task,
    Notification,
    ActivityLog,
    AppSetting,
]


def test_health_returns_200(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_roles_module_imports():
    assert app.api.roles is not None


def test_intent_classifier_returns_result_for_medicine_finished():
    result = get_intent_parser("offline_rules").parse("I finished my medicine")
    assert isinstance(result, IntentResult)
    assert result.intent == MEDICINE_UNAVAILABLE


def test_all_twelve_models_registered_on_metadata():
    assert len(MODELS) == 12
    registered = set(Base.metadata.tables.values())
    for model in MODELS:
        assert model.__table__ in registered

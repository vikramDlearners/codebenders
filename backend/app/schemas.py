"""Request and response models for the API."""

from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field


class UserOut(BaseModel):
    id: str
    email: str | None
    display_name: str


class SignInRequest(BaseModel):
    email: EmailStr
    display_name: str | None = Field(default=None, max_length=255)


class VerifyRequest(BaseModel):
    token: str = Field(min_length=10, max_length=200)


class SessionOut(BaseModel):
    session_token: str
    user: UserOut


class FamilyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class FamilyOut(BaseModel):
    id: str
    name: str


class MemberOut(BaseModel):
    membership_id: str
    user_id: str
    display_name: str
    email: str | None
    role_id: str
    role_name: str


class MemberCreate(BaseModel):
    email: EmailStr
    display_name: str | None = Field(default=None, max_length=255)
    role_id: str


class MemberRoleChange(BaseModel):
    role_id: str


class RoleOut(BaseModel):
    id: str
    name: str
    is_system: bool
    permissions: list[str]


class RoleCreate(BaseModel):
    name: str = Field(min_length=1, max_length=64)
    permissions: list[str]


class RolePermissionsUpdate(BaseModel):
    permissions: list[str]


class MyAccess(BaseModel):
    role: str
    permissions: list[str]


class CareProfileCreate(BaseModel):
    display_name: str = Field(min_length=1, max_length=255)
    greeting_name: str = Field(min_length=1, max_length=255)
    preferred_language: str = "en"
    timezone: str = "Asia/Kolkata"


class CareProfileUpdate(BaseModel):
    display_name: str | None = None
    greeting_name: str | None = None
    preferred_language: str | None = None
    timezone: str | None = None


class CareProfileOut(BaseModel):
    id: str
    display_name: str
    greeting_name: str
    preferred_language: str
    timezone: str


class MedicineCreate(BaseModel):
    care_profile_id: str
    display_name: str = Field(min_length=1, max_length=255)
    instructions_text: str | None = None
    quantity_remaining: int | None = None
    refill_date: date | None = None
    responsible_user_id: str | None = None


class MedicineUpdate(BaseModel):
    display_name: str | None = None
    instructions_text: str | None = None
    refill_date: date | None = None
    responsible_user_id: str | None = None
    active: bool | None = None


class QuantityUpdate(BaseModel):
    quantity: int = Field(ge=0)


class MedicineOut(BaseModel):
    id: str
    care_profile_id: str
    display_name: str
    instructions_text: str | None
    quantity_remaining: int | None
    refill_date: date | None
    responsible_user_id: str | None
    active: bool


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    due_at: datetime | None = None
    priority: str = "normal"
    assigned_to_user_id: str | None = None
    care_profile_id: str | None = None


class TaskAssign(BaseModel):
    assignee_user_id: str


class TaskStatusUpdate(BaseModel):
    status: str


class TaskOut(BaseModel):
    id: str
    title: str
    description: str | None
    due_at: datetime | None
    status: str
    priority: str
    assigned_to_user_id: str | None
    created_by_user_id: str


class NotificationOut(BaseModel):
    id: str
    family_id: str | None
    type: str
    payload: dict | None
    status: str
    created_at: datetime


class ActivityOut(BaseModel):
    id: str
    actor_id: str | None
    action: str
    object_type: str
    object_id: str | None
    metadata: dict | None
    created_at: datetime


class IntentModeOut(BaseModel):
    intent_mode: str


class IntentModeUpdate(BaseModel):
    intent_mode: str


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    due_at: datetime | None = None
    priority: str | None = None


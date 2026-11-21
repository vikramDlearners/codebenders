"""Roles and their permission codes. Viewing needs members.manage; editing needs roles.manage."""

from fastapi import APIRouter
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, DbSession
from app.models.user import User
from app.schemas import RoleCreate, RoleOut, RolePermissionsUpdate
from app.services import families as svc

router = APIRouter(prefix="/api/families/{family_id}/roles", tags=["roles"])


@router.get("", response_model=list[RoleOut])
def list_roles(family_id: str, db: Session = DbSession, user: User = CurrentUser) -> list[RoleOut]:
    return [RoleOut(**r) for r in svc.list_roles(db, user.id, family_id)]


@router.post("", response_model=RoleOut, status_code=201)
def create_role(
    family_id: str, body: RoleCreate, db: Session = DbSession, user: User = CurrentUser
) -> RoleOut:
    role = svc.create_custom_role(db, user.id, family_id, body.name, body.permissions)
    match = next(r for r in svc.list_roles(db, user.id, family_id) if r["id"] == role.id)
    return RoleOut(**match)


@router.put("/{role_id}/permissions", response_model=RoleOut)
def update_permissions(
    family_id: str, role_id: str, body: RolePermissionsUpdate,
    db: Session = DbSession, user: User = CurrentUser,
) -> RoleOut:
    role = svc.update_role_permissions(db, user.id, family_id, role_id, body.permissions)
    match = next(r for r in svc.list_roles(db, user.id, family_id) if r["id"] == role.id)
    return RoleOut(**match)

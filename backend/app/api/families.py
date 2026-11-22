"""Families, members and the caller's own access summary."""

from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, DbSession
from app.models.membership import FamilyMember
from app.models.user import User
from app.schemas import FamilyCreate, FamilyOut, MemberCreate, MemberOut, MemberRoleChange, MyAccess
from app.services import families as svc
from app.services.permissions import get_membership, permission_codes_for
from app.services.permissions import require  # noqa: F401  (re-exported for readers of this module)

router = APIRouter(prefix="/api/families", tags=["families"])


def _member_out(row) -> MemberOut:
    membership, user, role = row
    return MemberOut(
        membership_id=membership.id,
        user_id=user.id,
        display_name=user.display_name,
        email=user.email,
        role_id=role.id,
        role_name=role.name,
        relationship=membership.relationship,
    )


@router.get("", response_model=list[FamilyOut])
def my_families(db: Session = DbSession, user: User = CurrentUser) -> list[FamilyOut]:
    return [FamilyOut(id=f.id, name=f.name) for f in svc.list_families_for_user(db, user.id)]


@router.post("", response_model=FamilyOut, status_code=201)
def create_family(body: FamilyCreate, db: Session = DbSession, user: User = CurrentUser) -> FamilyOut:
    family = svc.create_family(db, user, body.name)
    return FamilyOut(id=family.id, name=family.name)


@router.get("/{family_id}", response_model=FamilyOut)
def get_family(family_id: str, db: Session = DbSession, user: User = CurrentUser) -> FamilyOut:
    family = svc.get_family(db, user.id, family_id)
    return FamilyOut(id=family.id, name=family.name)


@router.get("/{family_id}/me", response_model=MyAccess)
def my_access(family_id: str, db: Session = DbSession, user: User = CurrentUser) -> MyAccess:
    data = svc.membership_permissions(db, user.id, family_id)
    return MyAccess(**data)


@router.get("/{family_id}/members", response_model=list[MemberOut])
def list_members(family_id: str, db: Session = DbSession, user: User = CurrentUser) -> list[MemberOut]:
    return [_member_out(row) for row in svc.list_members(db, user.id, family_id)]


@router.post("/{family_id}/members", response_model=MemberOut, status_code=201)
def add_member(
    family_id: str, body: MemberCreate, db: Session = DbSession, user: User = CurrentUser
) -> MemberOut:
    membership = svc.add_member(
        db, user.id, family_id, body.email, body.role_id, body.display_name,
        relationship=body.relationship,
    )
    rows = svc.list_members(db, user.id, family_id)
    row = next(r for r in rows if r[0].id == membership.id)
    return _member_out(row)


@router.post("/{family_id}/members/{membership_id}/invite", status_code=201)
def invite_parent(
    family_id: str, membership_id: str, db: Session = DbSession, user: User = CurrentUser
) -> dict:
    # Emails a one-time sign-in link to the parent member and returns the address it was sent to plus the link.
    email, link = svc.create_parent_invite(db, user.id, family_id, membership_id)
    return {"email": email, "invite_link": link}


@router.patch("/{family_id}/members/{membership_id}", response_model=MemberOut)
def change_role(
    family_id: str, membership_id: str, body: MemberRoleChange,
    db: Session = DbSession, user: User = CurrentUser,
) -> MemberOut:
    membership = svc.change_member_role(db, user.id, family_id, membership_id, body.role_id)
    rows = svc.list_members(db, user.id, family_id)
    row = next(r for r in rows if r[0].id == membership.id)
    return _member_out(row)

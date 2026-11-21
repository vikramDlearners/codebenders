"""Families, members and roles. Every action is permission-checked and logged."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.family import Family
from app.models.membership import FamilyMember
from app.models.role import Role, RolePermission
from app.models.user import User
from app.services.activity import log_activity
from app.services.errors import NotFound
from app.services.permissions import (
    DEFAULT_ROLES,
    PermissionDenied,
    permission_codes_for,
    require,
    get_membership,
    validate_permission_codes,
)


def create_family(db: Session, creator: User, name: str) -> Family:
    """Create a family with the four default roles; the creator becomes Family manager."""
    family = Family(name=name.strip(), created_by_user_id=creator.id)
    db.add(family)
    db.flush()

    manager_role_id = None
    for role_name, codes in DEFAULT_ROLES.items():
        role = Role(family_id=family.id, name=role_name, is_system=True)
        db.add(role)
        db.flush()
        for code in sorted(codes):
            db.add(RolePermission(role_id=role.id, permission=code))
        if role_name == "Family manager":
            manager_role_id = role.id

    db.add(FamilyMember(family_id=family.id, user_id=creator.id, role_id=manager_role_id))
    log_activity(db, family.id, creator.id, "family.created", "family", family.id)
    db.commit()
    return family


def list_families_for_user(db: Session, user_id: str) -> list[Family]:
    stmt = (
        select(Family)
        .join(FamilyMember, FamilyMember.family_id == Family.id)
        .where(FamilyMember.user_id == user_id, FamilyMember.status == "active")
        .order_by(Family.created_at)
    )
    return list(db.execute(stmt).scalars())


def get_family(db: Session, actor_id: str, family_id: str) -> Family:
    require(db, actor_id, family_id, "dashboard.view")
    family = db.get(Family, family_id)
    if family is None:
        raise NotFound("Family not found")
    return family


def list_members(db: Session, actor_id: str, family_id: str) -> list[tuple[FamilyMember, User, Role]]:
    require(db, actor_id, family_id, "dashboard.view")
    stmt = (
        select(FamilyMember, User, Role)
        .join(User, User.id == FamilyMember.user_id)
        .join(Role, Role.id == FamilyMember.role_id)
        .where(FamilyMember.family_id == family_id, FamilyMember.status == "active")
        .order_by(User.display_name)
    )
    return [tuple(row) for row in db.execute(stmt).all()]


def _role_in_family(db: Session, family_id: str, role_id: str) -> Role:
    role = db.get(Role, role_id)
    if role is None or role.family_id != family_id:
        raise NotFound("Role not found in this family")
    return role


def list_roles(db: Session, actor_id: str, family_id: str) -> list[dict]:
    require(db, actor_id, family_id, "members.manage")
    roles = db.execute(
        select(Role).where(Role.family_id == family_id).order_by(Role.name)
    ).scalars()
    result = []
    for role in roles:
        codes = sorted(
            db.execute(
                select(RolePermission.permission).where(RolePermission.role_id == role.id)
            ).scalars()
        )
        result.append({"id": role.id, "name": role.name, "is_system": role.is_system, "permissions": codes})
    return result


def create_custom_role(
    db: Session, actor_id: str, family_id: str, name: str, codes: list[str]
) -> Role:
    require(db, actor_id, family_id, "roles.manage")
    clean = validate_permission_codes(codes)
    role = Role(family_id=family_id, name=name.strip(), is_system=False)
    db.add(role)
    db.flush()
    for code in clean:
        db.add(RolePermission(role_id=role.id, permission=code))
    log_activity(db, family_id, actor_id, "role.created", "role", role.id, {"name": role.name})
    db.commit()
    return role


def update_role_permissions(
    db: Session, actor_id: str, family_id: str, role_id: str, codes: list[str]
) -> Role:
    require(db, actor_id, family_id, "roles.manage")
    role = _role_in_family(db, family_id, role_id)
    if role.is_system:
        raise ValueError("System roles cannot be edited; create a custom role instead")
    clean = validate_permission_codes(codes)
    for old in db.execute(
        select(RolePermission).where(RolePermission.role_id == role.id)
    ).scalars():
        db.delete(old)
    db.flush()
    for code in clean:
        db.add(RolePermission(role_id=role.id, permission=code))
    log_activity(
        db, family_id, actor_id, "role.permissions_updated", "role", role.id, {"permissions": clean}
    )
    db.commit()
    return role


def add_member(
    db: Session,
    actor_id: str,
    family_id: str,
    email: str,
    role_id: str,
    display_name: str | None = None,
) -> FamilyMember:
    """Add a person to the family. Creates the user record if the email is new."""
    require(db, actor_id, family_id, "members.manage")
    role = _role_in_family(db, family_id, role_id)
    email = email.strip().lower()
    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if user is None:
        if not display_name or not display_name.strip():
            raise ValueError("display_name is required for a new person")
        user = User(email=email, display_name=display_name.strip())
        db.add(user)
        db.flush()
    existing = db.execute(
        select(FamilyMember).where(
            FamilyMember.family_id == family_id, FamilyMember.user_id == user.id
        )
    ).scalar_one_or_none()
    if existing is not None:
        raise ValueError("This person is already a member; one role per member per family")
    membership = FamilyMember(family_id=family_id, user_id=user.id, role_id=role.id)
    db.add(membership)
    log_activity(
        db, family_id, actor_id, "member.added", "member", membership.id, {"role": role.name}
    )
    db.commit()
    return membership


def change_member_role(
    db: Session, actor_id: str, family_id: str, membership_id: str, role_id: str
) -> FamilyMember:
    require(db, actor_id, family_id, "members.manage")
    role = _role_in_family(db, family_id, role_id)
    membership = db.get(FamilyMember, membership_id)
    if membership is None or membership.family_id != family_id:
        raise NotFound("Member not found")
    membership.role_id = role.id
    log_activity(
        db, family_id, actor_id, "member.role_changed", "member", membership.id, {"role": role.name}
    )
    db.commit()
    return membership


def membership_permissions(db: Session, actor_id: str, family_id: str) -> dict:
    """Return the caller's role name and permission codes (used by the UI to hide controls)."""
    membership = get_membership(db, actor_id, family_id)
    role = db.get(Role, membership.role_id)
    return {"role": role.name if role else "", "permissions": sorted(permission_codes_for(db, membership))}


__all__ = [
    "PermissionDenied",
    "create_family",
    "list_families_for_user",
    "get_family",
    "list_members",
    "list_roles",
    "create_custom_role",
    "update_role_permissions",
    "add_member",
    "change_member_role",
    "membership_permissions",
]

"""Parent care profiles. Viewing needs parent_profile.view; creating, editing and deleting need parent_profile.edit."""

from fastapi import APIRouter, Response
from sqlalchemy.orm import Session

from app.api.deps import CurrentUser, DbSession
from app.models.care_profile import CareProfile
from app.models.user import User
from app.schemas import CareProfileCreate, CareProfileOut, CareProfileUpdate
from app.services import care as svc

router = APIRouter(prefix="/api/families/{family_id}/care-profiles", tags=["care-profiles"])


def _out(profile: CareProfile) -> CareProfileOut:
    return CareProfileOut(
        id=profile.id,
        display_name=profile.display_name,
        greeting_name=profile.greeting_name,
        preferred_language=profile.preferred_language,
        timezone=profile.timezone,
    )


@router.get("", response_model=list[CareProfileOut])
def list_care_profiles(
    family_id: str, db: Session = DbSession, user: User = CurrentUser
) -> list[CareProfileOut]:
    return [_out(p) for p in svc.list_care_profiles(db, user.id, family_id)]


@router.post("", response_model=CareProfileOut, status_code=201)
def create_care_profile(
    family_id: str, body: CareProfileCreate, db: Session = DbSession, user: User = CurrentUser
) -> CareProfileOut:
    profile = svc.create_care_profile(
        db,
        user.id,
        family_id,
        body.display_name,
        body.greeting_name,
        body.preferred_language,
        body.timezone,
    )
    return _out(profile)


@router.get("/{profile_id}", response_model=CareProfileOut)
def get_care_profile(
    family_id: str, profile_id: str, db: Session = DbSession, user: User = CurrentUser
) -> CareProfileOut:
    return _out(svc.get_care_profile(db, user.id, family_id, profile_id))


@router.patch("/{profile_id}", response_model=CareProfileOut)
def update_care_profile(
    family_id: str, profile_id: str, body: CareProfileUpdate,
    db: Session = DbSession, user: User = CurrentUser,
) -> CareProfileOut:
    changes = body.model_dump(exclude_none=True)
    return _out(svc.update_care_profile(db, user.id, family_id, profile_id, changes))


@router.delete("/{profile_id}", status_code=204)
def delete_care_profile(
    family_id: str, profile_id: str, db: Session = DbSession, user: User = CurrentUser
) -> Response:
    svc.delete_care_profile(db, user.id, family_id, profile_id)
    return Response(status_code=204)

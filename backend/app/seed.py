"""Demo seed data (synthetic only). Run after migrations: `python -m app.seed` from the backend folder.

Creates one demo caregiver, one family, one parent care profile and one medicine.
Safe to re-run: it exits without changes if the demo caregiver already exists.
"""

from sqlalchemy import select

from app.core.db import SessionLocal
from app.models.user import User
from app.services import care
from app.services import families

DEMO_EMAIL = "demo.caregiver@example.com"
DEMO_NAME = "Demo Caregiver"


def seed() -> None:
    db = SessionLocal()
    try:
        existing = db.execute(select(User).where(User.email == DEMO_EMAIL)).scalar_one_or_none()
        if existing is not None:
            print("Demo data already present; nothing to do.")
            return
        caregiver = User(email=DEMO_EMAIL, display_name=DEMO_NAME)
        db.add(caregiver)
        db.commit()

        family = families.create_family(db, caregiver, "Demo Family")
        profile = care.create_care_profile(
            db, caregiver.id, family.id, "Demo Parent", "Amma", "en", "Asia/Kolkata"
        )
        care.create_medicine(
            db,
            caregiver.id,
            family.id,
            profile.id,
            "Demo Medicine",
            instructions_text="Take after breakfast (synthetic example)",
            quantity_remaining=30,
        )
        print(f"Seeded family {family.id} with care profile {profile.id}.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()

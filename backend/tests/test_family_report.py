"""Monthly parent report: period, medicine check-ins, diet days, health entries, appointment notes, checklist."""

from datetime import date, datetime, timezone

import pytest

from app.models.appointment import Appointment
from app.models.care_profile import CareProfile
from app.models.checkin import HealthCheckin
from app.models.dose import MedicineDose
from app.models.meal import MealLog
from app.models.medicine import Medicine
from app.models.prescription_scan import MedicineReminder
from app.models.user import User
from app.services import doses as doses_svc
from app.services import families as families_svc
from app.services.auth import create_auth_session

# A past month, so every day in it has elapsed and the expected numbers do not depend on today's date.
MONTH = "2024-03"
EXPECTED_KEYS = {
    "profile", "period", "summary", "medicines", "diet", "health_entries",
    "appointment_notes", "checklist", "disclaimer",
}


@pytest.fixture()
def report_setup(db_session):
    manager = User(email="manager@example.com", display_name="Vikram")
    stranger = User(email="stranger@example.com", display_name="Stranger")
    db_session.add_all([manager, stranger])
    db_session.commit()
    family = families_svc.create_family(db_session, manager, "Singh family")
    other_family = families_svc.create_family(db_session, stranger, "Other family")

    appa = CareProfile(family_id=family.id, display_name="Appa", greeting_name="Appa", timezone="Asia/Kolkata")
    rival = CareProfile(
        family_id=other_family.id, display_name="Rival", greeting_name="Rival", timezone="Asia/Kolkata"
    )
    db_session.add_all([appa, rival])
    db_session.commit()

    amlodipine = Medicine(care_profile_id=appa.id, display_name="Amlodipine", quantity_remaining=14, active=True)
    db_session.add(amlodipine)
    db_session.commit()
    for t in ("08:00", "20:00"):
        db_session.add(MedicineReminder(medicine_id=amlodipine.id, time_of_day=t, active=True))
    db_session.commit()

    return {
        "manager": manager,
        "stranger": stranger,
        "family": family,
        "appa": appa,
        "rival": rival,
        "amlodipine": amlodipine,
    }


def _auth(db, user: User) -> dict:
    return {"Authorization": f"Bearer {create_auth_session(db, user.id)}"}


def _get(client, db, user, family_id, **params):
    return client.get(f"/api/families/{family_id}/report", params=params, headers=_auth(db, user))


def test_response_shape_and_period(client, db_session, report_setup):
    s = report_setup
    response = _get(client, db_session, s["manager"], s["family"].id, month=MONTH, care_profile_id=s["appa"].id)
    assert response.status_code == 200, response.text
    body = response.json()
    assert set(body) == EXPECTED_KEYS
    assert body["profile"]["display_name"] == "Appa"
    assert body["period"] == {"month": "2024-03", "start": "2024-03-01", "end": "2024-03-31", "days_elapsed": 31}


def test_month_defaults_to_current_month(client, db_session, report_setup):
    s = report_setup
    body = _get(client, db_session, s["manager"], s["family"].id, care_profile_id=s["appa"].id).json()
    today = doses_svc.today_for(s["appa"], datetime.now(timezone.utc))
    assert body["period"]["month"] == today.strftime("%Y-%m")


def test_medicine_checkins_taken_out_of_scheduled(client, db_session, report_setup):
    s = report_setup
    rows = [
        (date(2024, 3, 1), "08:00", "taken"),
        (date(2024, 3, 1), "20:00", "not_taken"),
        (date(2024, 3, 2), "08:00", "taken"),
    ]
    for day, slot, status in rows:
        db_session.add(MedicineDose(
            family_id=s["family"].id, care_profile_id=s["appa"].id, medicine_id=s["amlodipine"].id,
            dose_date=day, slot=slot, status=status, source="manual",
        ))
    db_session.commit()

    body = _get(client, db_session, s["manager"], s["family"].id, month=MONTH, care_profile_id=s["appa"].id).json()
    [med] = body["medicines"]
    assert med["display_name"] == "Amlodipine"
    assert med["schedule"] == ["08:00", "20:00"]
    assert med["scheduled"] == 62  # 31 days, two doses a day
    assert med["taken"] == 2
    assert med["recorded"] == 3
    assert med["stock_days_left"] == 7.0
    assert med["low_stock"] is True
    assert body["summary"]["medicine_checkins_recorded_pct"] == 5  # 3 of 62


def test_diet_days_per_meal_and_water_fruit(client, db_session, report_setup):
    s = report_setup
    entries = [
        (date(2024, 3, 1), "breakfast", "Idli and water"),
        (date(2024, 3, 1), "lunch,dinner", "Rice and dal"),
        (date(2024, 3, 5), "breakfast", "Fruit and water"),
    ]
    for day, meals, text in entries:
        db_session.add(MealLog(
            family_id=s["family"].id, care_profile_id=s["appa"].id, log_date=day, meals=meals, text=text,
        ))
    db_session.commit()

    body = _get(client, db_session, s["manager"], s["family"].id, month=MONTH, care_profile_id=s["appa"].id).json()
    assert body["diet"]["meals"] == [
        {"meal": "breakfast", "days_logged": 2},
        {"meal": "lunch", "days_logged": 1},
        {"meal": "dinner", "days_logged": 1},
    ]
    assert body["diet"]["water_days"] == 2
    assert body["diet"]["fruit_days"] == 1
    assert body["diet"]["days_with_entries"] == 2  # entries on 1 and 5 March
    assert body["summary"]["diet_days_recorded_pct"] == 6  # 2 of 31


def test_health_entries_and_appointment_notes_limited_to_month(client, db_session, report_setup):
    s = report_setup
    manager = s["manager"]
    db_session.add_all([
        HealthCheckin(
            family_id=s["family"].id, care_profile_id=s["appa"].id, parent_user_id=manager.id,
            checkin_date=date(2024, 3, 4), health_text="BP 130/84 this morning", urgent=False,
        ),
        HealthCheckin(
            family_id=s["family"].id, care_profile_id=s["appa"].id, parent_user_id=manager.id,
            checkin_date=date(2024, 2, 28), health_text="Outside the month", urgent=False,
        ),
        HealthCheckin(
            family_id=s["family"].id, care_profile_id=s["appa"].id, parent_user_id=manager.id,
            checkin_date=date(2024, 3, 9), health_text=None, urgent=False,
        ),
        Appointment(
            family_id=s["family"].id, care_profile_id=s["appa"].id, scheduled_date=date(2024, 3, 10),
            start_time="10:30", provider="Dr. S. Narayanan", reason="Cardiology", notes="Bring the BP log",
            status="completed", location="City Care Hospital",
        ),
        Appointment(
            family_id=s["family"].id, care_profile_id=s["appa"].id, scheduled_date=date(2024, 4, 2),
            start_time="10:30", provider="Dr. S. Narayanan", reason="Later", notes="Not this month",
            status="scheduled",
        ),
    ])
    db_session.commit()

    body = _get(client, db_session, manager, s["family"].id, month=MONTH, care_profile_id=s["appa"].id).json()
    assert body["health_entries"] == [{"day": "2024-03-04", "text": "BP 130/84 this morning", "urgent": False}]
    assert [n["notes"] for n in body["appointment_notes"]] == ["Bring the BP log"]
    assert body["summary"]["health_entries"] == 1
    assert body["summary"]["followups_to_review"] == 1


def test_checklist_low_stock_and_unconfirmed_checkins(client, db_session, report_setup):
    s = report_setup
    body = _get(client, db_session, s["manager"], s["family"].id, month=MONTH, care_profile_id=s["appa"].id).json()
    assert body["checklist"]["low_stock"] == ["Amlodipine"]
    assert body["checklist"]["unconfirmed_checkins"] == 62  # no answers recorded at all
    assert body["disclaimer"]


def test_invalid_month_is_422(client, db_session, report_setup):
    s = report_setup
    response = _get(client, db_session, s["manager"], s["family"].id, month="2024-13", care_profile_id=s["appa"].id)
    assert response.status_code == 422


def test_outsider_cannot_read_report(client, db_session, report_setup):
    s = report_setup
    response = _get(client, db_session, s["stranger"], s["family"].id, month=MONTH)
    assert response.status_code == 403


def test_care_profile_from_other_family_is_not_found(client, db_session, report_setup):
    s = report_setup
    response = _get(client, db_session, s["manager"], s["family"].id, month=MONTH, care_profile_id=s["rival"].id)
    assert response.status_code == 404

"""Monthly parent health report: what the family recorded for one parent in one month.

Medicine check-ins, meal logs, health check-in text and appointments are read from their tables for the selected
care profile. Nothing is estimated: a count is only shown when the table holds the rows for it. Permission is
checked by the caller.
"""

import calendar
from datetime import date, datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.appointment import Appointment
from app.models.care_profile import CareProfile
from app.models.checkin import HealthCheckin
from app.models.dose import MedicineDose
from app.models.meal import MealLog
from app.models.medicine import Medicine
from app.models.membership import FamilyMember
from app.services.doses import today_for
from app.services.errors import NotFound
from app.services.meals import MEALS
from app.services.profile import age_from, get_care_profile_onboarding
from app.services.reminders import list_reminder_times

LOW_STOCK_DAYS = 7
CANCELLED = "cancelled"
# Answers the parent or the family recorded. "missed" comes from the missed-dose job and is counted separately.
RECORDED_STATUSES = ("taken", "not_taken", "skipped")
TAKEN = "taken"
MISSED = "missed"
DISCLAIMER = (
    "This report contains family-entered records only. It is not medical advice and not a clinical assessment. "
    "CareCircle organises family care information; it does not diagnose, interpret results or verify that "
    "medicine was taken. For clinical questions, contact the treating healthcare professional."
)


def _month_bounds(month_start: date | None, today: date) -> tuple[date, date]:
    first = month_start.replace(day=1) if month_start is not None else today.replace(day=1)
    last = first.replace(day=calendar.monthrange(first.year, first.month)[1])
    return first, last


def _select_profile(db: Session, family_id: str, care_profile_id: str | None) -> CareProfile:
    query = select(CareProfile).where(CareProfile.family_id == family_id).order_by(CareProfile.created_at)
    profiles = list(db.execute(query).scalars().all())
    if care_profile_id is None:
        if not profiles:
            raise NotFound("Care profile not found")
        return profiles[0]
    selected = next((p for p in profiles if p.id == care_profile_id), None)
    if selected is None:
        raise NotFound("Care profile not found")
    return selected


def _profile_block(db: Session, profile: CareProfile) -> dict[str, Any]:
    onboarding = get_care_profile_onboarding(db, profile)
    membership = db.get(FamilyMember, profile.linked_member_id) if profile.linked_member_id else None
    relationship = (onboarding.relationship if onboarding is not None else None) or (
        membership.relationship if membership is not None else None
    )
    return {
        "display_name": profile.display_name,
        "age": age_from(onboarding) if onboarding is not None else None,
        "relationship": relationship,
        "primary_caregiver_name": onboarding.caregiver_name if onboarding is not None else None,
        "preferred_language": profile.preferred_language,
        "health_details": onboarding.known_health_conditions if onboarding is not None else None,
        "primary_doctor": onboarding.primary_doctor_name if onboarding is not None else None,
    }


def _percent(part: int, whole: int) -> int | None:
    return min(100, round(100 * part / whole)) if whole else None


def _medicines(
    db: Session, profile: CareProfile, start: date, end: date, days_elapsed: int,
) -> tuple[list[dict[str, Any]], int, int]:
    """Per active medicine; returns the rows plus the timed-dose totals used for the summary percentage."""
    meds = db.execute(
        select(Medicine)
        .where(Medicine.care_profile_id == profile.id, Medicine.active.is_(True))
        .order_by(Medicine.created_at, Medicine.id)
    ).scalars().all()
    doses = db.execute(
        select(MedicineDose).where(
            MedicineDose.care_profile_id == profile.id,
            MedicineDose.dose_date >= start,
            MedicineDose.dose_date <= end,
        )
    ).scalars().all()
    by_med: dict[str, list[MedicineDose]] = {}
    for row in doses:
        by_med.setdefault(row.medicine_id, []).append(row)

    out: list[dict[str, Any]] = []
    total_scheduled = total_recorded = 0
    for med in meds:
        times = list_reminder_times(db, med.id)
        rows = [r for r in by_med.get(med.id, []) if not times or r.slot in times]
        # A medicine without reminder times has no known number of doses per day, so nothing is scheduled.
        scheduled = days_elapsed * len(times) if times else None
        recorded = sum(1 for r in rows if r.status in RECORDED_STATUSES)
        days_left = round(med.quantity_remaining / len(times), 1) if times and med.quantity_remaining is not None else None
        if scheduled is not None:
            total_scheduled += scheduled
            total_recorded += recorded
        out.append({
            "medicine_id": med.id,
            "display_name": med.display_name,
            "schedule": times,
            "scheduled": scheduled,
            "taken": sum(1 for r in rows if r.status == TAKEN),
            "recorded": recorded,
            "missed": sum(1 for r in rows if r.status == MISSED),
            "stock_days_left": days_left,
            "low_stock": days_left is not None and days_left <= LOW_STOCK_DAYS,
        })
    return out, total_scheduled, total_recorded


def _diet(db: Session, profile: CareProfile, start: date, end: date) -> tuple[dict[str, Any], set[date]]:
    rows = db.execute(
        select(MealLog).where(
            MealLog.care_profile_id == profile.id, MealLog.log_date >= start, MealLog.log_date <= end,
        )
    ).scalars().all()
    meal_days: dict[str, set[date]] = {m: set() for m in MEALS}
    any_days: set[date] = set()
    water_days: set[date] = set()
    fruit_days: set[date] = set()
    for row in rows:
        any_days.add(row.log_date)
        for meal in row.meals.split(","):
            if meal in meal_days:
                meal_days[meal].add(row.log_date)
        # meal_logs keeps the parent's words only, so water and fruit days are found by those words in the text.
        text = row.text.lower()
        if "water" in text:
            water_days.add(row.log_date)
        if "fruit" in text:
            fruit_days.add(row.log_date)
    diet = {
        "meals": [{"meal": m, "days_logged": len(meal_days[m])} for m in MEALS],
        "water_days": len(water_days),
        "fruit_days": len(fruit_days),
        "days_with_entries": len(any_days),
    }
    return diet, any_days


def _appointment_out(a: Appointment) -> dict[str, Any]:
    return {
        "id": a.id,
        "scheduled_date": a.scheduled_date,
        "start_time": a.start_time,
        "reason": a.reason,
        "provider": a.provider,
        "location": a.location,
        "status": a.status,
        "notes": a.notes or "",
    }


def build_family_report(
    db: Session,
    family_id: str,
    care_profile_id: str | None = None,
    month_start: date | None = None,
) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    profile = _select_profile(db, family_id, care_profile_id)
    today = today_for(profile, now)
    start, end = _month_bounds(month_start, today)
    # Days that have started by today; a future month has none yet.
    last_counted = min(end, today)
    days_elapsed = (last_counted - start).days + 1 if last_counted >= start else 0

    medicines, total_scheduled, total_recorded = _medicines(db, profile, start, end, days_elapsed)
    diet, diet_days = _diet(db, profile, start, end)

    health_rows = db.execute(
        select(HealthCheckin)
        .where(
            HealthCheckin.care_profile_id == profile.id,
            HealthCheckin.checkin_date >= start,
            HealthCheckin.checkin_date <= end,
        )
        .order_by(HealthCheckin.checkin_date, HealthCheckin.id)
    ).scalars().all()
    health_entries = [
        {"day": r.checkin_date, "text": r.health_text.strip(), "urgent": bool(r.urgent)}
        for r in health_rows
        if r.health_text and r.health_text.strip()
    ]

    appointments = db.execute(
        select(Appointment)
        .where(
            Appointment.care_profile_id == profile.id,
            Appointment.scheduled_date >= start,
            Appointment.scheduled_date <= end,
        )
        .order_by(Appointment.scheduled_date, Appointment.start_time)
    ).scalars().all()
    appointment_notes = [
        _appointment_out(a) for a in appointments if a.status != CANCELLED and a.notes and a.notes.strip()
    ]
    upcoming = [
        _appointment_out(a) for a in appointments if a.status != CANCELLED and a.scheduled_date >= today
    ]

    return {
        "profile": _profile_block(db, profile),
        "period": {
            "month": start.strftime("%Y-%m"),
            "start": start,
            "end": end,
            "days_elapsed": days_elapsed,
        },
        "summary": {
            "medicine_checkins_recorded_pct": _percent(total_recorded, total_scheduled),
            "diet_days_recorded_pct": _percent(len(diet_days), days_elapsed),
            "health_entries": len(health_entries),
            "followups_to_review": len(appointment_notes),
        },
        "medicines": medicines,
        "diet": diet,
        "health_entries": health_entries,
        "appointment_notes": appointment_notes,
        "checklist": {
            "low_stock": [m["display_name"] for m in medicines if m["low_stock"]],
            "unconfirmed_checkins": total_scheduled - total_recorded,
            "upcoming_appointments": upcoming,
        },
        "disclaimer": DISCLAIMER,
    }

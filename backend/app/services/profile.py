"""Completion score and age helpers for the parent onboarding profile."""

from datetime import date


# Each slot is one countable field. A tuple slot counts as filled when any of its fields is set.
SECTION_SLOTS: dict[str, tuple] = {
    "parent": (
        "parent_full_name",
        "preferred_name",
        "relationship",
        ("date_of_birth", "approximate_age"),
        "preferred_language",
    ),
    "communication": ("parent_mobile", "preferred_language"),
    "care": ("caregiver_name", "caregiver_relationship", "caregiver_phone", "caregiver_email"),
    "medical": (
        "known_health_conditions",
        "allergies",
        "primary_doctor_name",
        "doctor_contact_number",
        "preferred_hospital",
        "care_instructions",
    ),
    "additional": ("profile_picture_url",),
}


def _has_value(value: object) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    return True


def _slot_filled(profile: object, slot: str | tuple) -> bool:
    if isinstance(slot, tuple):
        return any(_has_value(getattr(profile, name, None)) for name in slot)
    return _has_value(getattr(profile, slot, None))


def _percent(filled: int, total: int) -> int:
    return round(100 * filled / total) if total else 0


def age_from(profile: object) -> int | None:
    """Years from date_of_birth if set, else approximate_age, else None."""
    dob = getattr(profile, "date_of_birth", None)
    if dob is not None:
        today = date.today()
        years = today.year - dob.year
        if (today.month, today.day) < (dob.month, dob.day):
            years -= 1
        return years
    return getattr(profile, "approximate_age", None)


def completion(profile: object) -> dict:
    """Return {"overall": int, "sections": {name: int}} as whole-number percentages.

    overall is filled slots across all sections divided by total slots, so
    preferred_language (in parent and communication) counts once per section.
    """
    sections: dict[str, int] = {}
    total_filled = 0
    total_slots = 0
    for name, slots in SECTION_SLOTS.items():
        filled = sum(1 for slot in slots if _slot_filled(profile, slot))
        sections[name] = _percent(filled, len(slots))
        total_filled += filled
        total_slots += len(slots)
    return {"overall": _percent(total_filled, total_slots), "sections": sections}

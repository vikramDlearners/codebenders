"""add parent_onboarding_profiles table

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-11-22 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'parent_onboarding_profiles',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('user_id', sa.String(length=36), sa.ForeignKey('users.id'), unique=True, nullable=False),
        sa.Column('parent_full_name', sa.String(length=120), nullable=True),
        sa.Column('preferred_name', sa.String(length=60), nullable=True),
        sa.Column('relationship', sa.String(length=20), nullable=True),
        sa.Column('date_of_birth', sa.Date(), nullable=True),
        sa.Column('approximate_age', sa.Integer(), nullable=True),
        sa.Column('profile_picture_url', sa.String(length=500), nullable=True),
        sa.Column('preferred_language', sa.String(length=20), nullable=True),
        sa.Column('parent_mobile', sa.String(length=20), nullable=True),
        sa.Column('known_health_conditions', sa.Text(), nullable=True),
        sa.Column('allergies', sa.Text(), nullable=True),
        sa.Column('primary_doctor_name', sa.String(length=120), nullable=True),
        sa.Column('doctor_contact_number', sa.String(length=30), nullable=True),
        sa.Column('preferred_hospital', sa.String(length=160), nullable=True),
        sa.Column('care_instructions', sa.Text(), nullable=True),
        sa.Column('caregiver_name', sa.String(length=120), nullable=True),
        sa.Column('caregiver_relationship', sa.String(length=60), nullable=True),
        sa.Column('caregiver_phone', sa.String(length=30), nullable=True),
        sa.Column('caregiver_email', sa.String(length=254), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('parent_onboarding_profiles')

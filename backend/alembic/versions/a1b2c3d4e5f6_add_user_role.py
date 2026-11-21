"""add user role and other_role

Revision ID: a1b2c3d4e5f6
Revises: 3923b1b1466b
Create Date: 2026-11-22 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '3923b1b1466b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('role', sa.String(length=32), nullable=True))
    op.add_column('users', sa.Column('other_role', sa.String(length=120), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'other_role')
    op.drop_column('users', 'role')

BEGIN;

-- Running upgrade 3923b1b1466b -> a1b2c3d4e5f6

ALTER TABLE users ADD COLUMN role VARCHAR(32);

ALTER TABLE users ADD COLUMN other_role VARCHAR(120);

UPDATE alembic_version SET version_num='a1b2c3d4e5f6' WHERE alembic_version.version_num = '3923b1b1466b';

COMMIT;


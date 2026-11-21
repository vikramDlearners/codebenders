BEGIN;

-- Running upgrade b2c3d4e5f6a7 -> c3d4e5f6a7b8

CREATE TABLE parent_invites (
    id VARCHAR(36) NOT NULL,
    family_id VARCHAR(36) NOT NULL,
    membership_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    email VARCHAR(320) NOT NULL,
    token_hash VARCHAR(128) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_by_user_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(family_id) REFERENCES families (id),
    FOREIGN KEY(membership_id) REFERENCES family_members (id),
    FOREIGN KEY(user_id) REFERENCES users (id),
    FOREIGN KEY(created_by_user_id) REFERENCES users (id)
);

CREATE UNIQUE INDEX ix_parent_invites_token_hash ON parent_invites (token_hash);

UPDATE alembic_version SET version_num='c3d4e5f6a7b8' WHERE alembic_version.version_num = 'b2c3d4e5f6a7';

COMMIT;

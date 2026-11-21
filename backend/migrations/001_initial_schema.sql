BEGIN;

CREATE TABLE alembic_version (
    version_num VARCHAR(32) NOT NULL, 
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

-- Running upgrade  -> 3923b1b1466b

CREATE TABLE app_settings (
    key VARCHAR(128) NOT NULL, 
    value VARCHAR(1024) NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    PRIMARY KEY (key)
);

CREATE TABLE users (
    id VARCHAR(36) NOT NULL, 
    email VARCHAR(320), 
    phone VARCHAR(32), 
    display_name VARCHAR(255) NOT NULL, 
    status VARCHAR(32) NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    UNIQUE (email)
);

CREATE TABLE families (
    id VARCHAR(36) NOT NULL, 
    name VARCHAR(255) NOT NULL, 
    created_by_user_id VARCHAR(36) NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(created_by_user_id) REFERENCES users (id)
);

CREATE TABLE login_tokens (
    id VARCHAR(36) NOT NULL, 
    user_id VARCHAR(36) NOT NULL, 
    token_hash VARCHAR(128) NOT NULL, 
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    used_at TIMESTAMP WITH TIME ZONE, 
    created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(user_id) REFERENCES users (id)
);

CREATE UNIQUE INDEX ix_login_tokens_token_hash ON login_tokens (token_hash);

CREATE TABLE activity_logs (
    id VARCHAR(36) NOT NULL, 
    family_id VARCHAR(36) NOT NULL, 
    actor_id VARCHAR(36), 
    action VARCHAR(64) NOT NULL, 
    object_type VARCHAR(64) NOT NULL, 
    object_id VARCHAR(36), 
    created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    metadata JSON, 
    PRIMARY KEY (id), 
    FOREIGN KEY(actor_id) REFERENCES users (id), 
    FOREIGN KEY(family_id) REFERENCES families (id)
);

CREATE TABLE care_profiles (
    id VARCHAR(36) NOT NULL, 
    family_id VARCHAR(36) NOT NULL, 
    display_name VARCHAR(255) NOT NULL, 
    greeting_name VARCHAR(255) NOT NULL, 
    preferred_language VARCHAR(8) NOT NULL, 
    timezone VARCHAR(64) NOT NULL, 
    linked_user_id VARCHAR(36), 
    created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(family_id) REFERENCES families (id), 
    FOREIGN KEY(linked_user_id) REFERENCES users (id)
);

CREATE TABLE notifications (
    id VARCHAR(36) NOT NULL, 
    recipient_user_id VARCHAR(36) NOT NULL, 
    family_id VARCHAR(36), 
    type VARCHAR(64) NOT NULL, 
    payload JSON, 
    status VARCHAR(16) NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    read_at TIMESTAMP WITH TIME ZONE, 
    PRIMARY KEY (id), 
    FOREIGN KEY(family_id) REFERENCES families (id), 
    FOREIGN KEY(recipient_user_id) REFERENCES users (id)
);

CREATE TABLE roles (
    id VARCHAR(36) NOT NULL, 
    family_id VARCHAR(36) NOT NULL, 
    name VARCHAR(64) NOT NULL, 
    is_system BOOLEAN NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(family_id) REFERENCES families (id)
);

CREATE TABLE family_members (
    id VARCHAR(36) NOT NULL, 
    family_id VARCHAR(36) NOT NULL, 
    user_id VARCHAR(36) NOT NULL, 
    role_id VARCHAR(36) NOT NULL, 
    status VARCHAR(32) NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(family_id) REFERENCES families (id), 
    FOREIGN KEY(role_id) REFERENCES roles (id), 
    FOREIGN KEY(user_id) REFERENCES users (id), 
    CONSTRAINT uq_family_members_family_id_user_id UNIQUE (family_id, user_id)
);

CREATE TABLE medicines (
    id VARCHAR(36) NOT NULL, 
    care_profile_id VARCHAR(36) NOT NULL, 
    display_name VARCHAR(255) NOT NULL, 
    instructions_text TEXT, 
    quantity_remaining INTEGER, 
    refill_date DATE, 
    responsible_user_id VARCHAR(36), 
    active BOOLEAN NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(care_profile_id) REFERENCES care_profiles (id), 
    FOREIGN KEY(responsible_user_id) REFERENCES users (id)
);

CREATE TABLE role_permissions (
    id VARCHAR(36) NOT NULL, 
    role_id VARCHAR(36) NOT NULL, 
    permission VARCHAR(100) NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(role_id) REFERENCES roles (id), 
    CONSTRAINT uq_role_permissions_role_id_permission UNIQUE (role_id, permission)
);

CREATE TABLE tasks (
    id VARCHAR(36) NOT NULL, 
    family_id VARCHAR(36) NOT NULL, 
    care_profile_id VARCHAR(36), 
    title VARCHAR(255) NOT NULL, 
    description TEXT, 
    assigned_to_user_id VARCHAR(36), 
    due_at TIMESTAMP WITH TIME ZONE, 
    status VARCHAR(16) NOT NULL, 
    priority VARCHAR(16) NOT NULL, 
    created_by_user_id VARCHAR(36) NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(assigned_to_user_id) REFERENCES users (id), 
    FOREIGN KEY(care_profile_id) REFERENCES care_profiles (id), 
    FOREIGN KEY(created_by_user_id) REFERENCES users (id), 
    FOREIGN KEY(family_id) REFERENCES families (id)
);

INSERT INTO alembic_version (version_num) VALUES ('3923b1b1466b') RETURNING alembic_version.version_num;

COMMIT;


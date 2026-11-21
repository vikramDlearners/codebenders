BEGIN;

-- Running upgrade a1b2c3d4e5f6 -> b2c3d4e5f6a7

CREATE TABLE parent_onboarding_profiles (
    id VARCHAR(36) NOT NULL, 
    user_id VARCHAR(36) NOT NULL, 
    parent_full_name VARCHAR(120), 
    preferred_name VARCHAR(60), 
    relationship VARCHAR(20), 
    date_of_birth DATE, 
    approximate_age INTEGER, 
    profile_picture_url VARCHAR(500), 
    preferred_language VARCHAR(20), 
    parent_mobile VARCHAR(20), 
    known_health_conditions TEXT, 
    allergies TEXT, 
    primary_doctor_name VARCHAR(120), 
    doctor_contact_number VARCHAR(30), 
    preferred_hospital VARCHAR(160), 
    care_instructions TEXT, 
    caregiver_name VARCHAR(120), 
    caregiver_relationship VARCHAR(60), 
    caregiver_phone VARCHAR(30), 
    caregiver_email VARCHAR(254), 
    updated_at TIMESTAMP WITH TIME ZONE, 
    PRIMARY KEY (id), 
    UNIQUE (user_id), 
    FOREIGN KEY(user_id) REFERENCES users (id)
);

UPDATE alembic_version SET version_num='b2c3d4e5f6a7' WHERE alembic_version.version_num = 'a1b2c3d4e5f6';

COMMIT;


# Database migrations (PostgreSQL)

Each `.sql` file in this folder is a complete, copy-paste-ready change to the PostgreSQL database. Files are numbered in the order they must run.

| File | What it does |
|------|--------------|
| 001_initial_schema.sql | Creates the 12 app tables and alembic_version. Run on an EMPTY database only. |
| 002_add_user_role.sql | Adds users.role and users.other_role. Run after 001, or on its own if 001 is already applied. |

## How to run

Open pgAdmin Query Tool or psql connected to the carecircle database, paste the file contents, and run. Or from PowerShell:

```
psql -U USER -d carecircle -f migrations\001_initial_schema.sql
```

psql prompts for the password.

## Rule for future changes

Every model change gets a new numbered .sql file here (003, 004, ...), generated from its Alembic revision with `alembic upgrade <previous>:<new> --sql`, so the file matches what the app expects.

## Note

These files are generated offline and have not been run against your server. Check the database afterwards with `\dt`.

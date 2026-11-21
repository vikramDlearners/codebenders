# CareCircle — Phase 1

CareCircle is a family care app with voice check-ins for an elderly parent. Family members see care profiles, medicines, tasks, notifications and activity.

**Stack:** React (frontend), FastAPI (backend), PostgreSQL (database).

**Integrations**
- **Speech:** ElevenLabs for speech-to-text and text-to-speech.
- **Intent parsing:** Google Gemini when online, with a rule-based offline fallback. An admin switch selects between them.
- **Messaging:** Email and SMS sit behind adapters. SMS is mocked in Phase 1.
- **Languages:** English, Tamil, Hindi.
- **Target:** iOS demo.

## Backend setup (Windows PowerShell)

```powershell
cd D:\CodeBasiscs\carecircle\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Settings are read from environment variables or backend\.env
$env:DATABASE_URL = "postgresql+psycopg://user:password@localhost:5432/carecircle"
$env:SECRET_KEY = "replace-me"
$env:GEMINI_API_KEY = "your-gemini-key"
$env:ELEVENLABS_API_KEY = "your-elevenlabs-key"

alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload
```

The API runs at http://127.0.0.1:8000.

Optional settings (defaults in `app/core/config.py`): `LOGIN_LINK_BASE_URL`, `LOGIN_TOKEN_MINUTES`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `SMS_PROVIDER` (default `mock`), `INTENT_MODE` (default `offline_rules`).

If `DATABASE_URL` is not set, the default is a local SQLite file, `sqlite:///./carecircle_dev.db`.

## Database migrations

- `alembic upgrade head` applies migrations.
- `alembic revision --autogenerate -m "message"` creates a new migration from model changes.
- Migrations are in `backend\alembic\versions\`.

## Frontend

The React frontend is not built yet. The UI reference designs are in the `UI\` folder at `D:\CodeBasiscs\UI`. The React app will be built from those designs in a later step.

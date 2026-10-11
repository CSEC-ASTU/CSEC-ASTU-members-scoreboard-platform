"""DATABASE_URL is a required setting; unit tests never connect to it."""

import os

os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://localhost:5432/csec_bot_unit_tests_unused")

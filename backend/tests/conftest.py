"""Test-run configuration.

JWT_SECRET_KEY and DATABASE_URL are required settings with no defaults. Give the
test process a fresh random secret (never a value committed to the repo) and a
database URL that unit tests never connect to. Integration tests use the
DATABASE_URL exported by the caller / CI, which setdefault leaves untouched.
"""

import os
import secrets

os.environ.setdefault("JWT_SECRET_KEY", secrets.token_urlsafe(48))
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://localhost:5432/csec_unit_tests_unused")

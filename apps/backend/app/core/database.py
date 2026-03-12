"""Database connection and utilities."""

from pathlib import Path
from app.core.config import settings


def get_db_path() -> Path:
    """Get the database file path."""
    if Path("/app").exists():
        db_path = Path("/app/data/db.sqlite")
    else:
        # Local development: one DB — backend/data/db.sqlite (parent.parent.parent = backend)
        db_path = Path(__file__).parent.parent.parent / "data" / "db.sqlite"
    return db_path.resolve()


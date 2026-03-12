"""Security utilities for authentication."""

from werkzeug.security import generate_password_hash, check_password_hash
from typing import Optional, Dict, Any


def hash_password(password: str) -> str:
    """Hash a password using Werkzeug (for compatibility with existing data)."""
    return generate_password_hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    """Verify a password against a hash."""
    return check_password_hash(password_hash, password)


def is_admin_user(user: Dict[str, Any]) -> bool:
    """Check if user is admin."""
    return user.get("username") == "admin@mango"


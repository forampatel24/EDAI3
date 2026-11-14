"""Shared small helpers used across routers/services."""
import os
import re
from datetime import datetime, timezone


def utcnow() -> datetime:
    """Naive UTC now — matches the naive datetimes stored in SQLite columns."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def parse_iso_utc(value: str):
    """Parse an ISO datetime string; normalise any tzinfo to naive UTC so it can
    be compared with values stored in the DB. Returns None on failure."""
    if not value:
        return None
    dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def sanitize_filename(name: str) -> str:
    """Strip any directory part and unsafe characters so a client-supplied
    filename can never escape the upload directory."""
    name = str(name or "").replace("\\", "/")
    name = name.rsplit("/", 1)[-1]
    name = re.sub(r"[^A-Za-z0-9._ -]+", "_", name).strip(" ._")
    return name[:120] or "file"

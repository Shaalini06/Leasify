"""Database configuration module for the Contract Analysis Engine."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Generator

from pymongo import MongoClient, ReturnDocument
from pymongo.database import Database
from pymongo.errors import ConfigurationError

try:
    from dotenv import load_dotenv as _load_dotenv
except ModuleNotFoundError:
    def _load_dotenv() -> bool:
        """Fallback .env loader used when python-dotenv is unavailable."""
        env_path = Path(__file__).resolve().parent / ".env"
        if not env_path.exists():
            return False

        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))

        return True


# Load environment variables from a local .env file when available.
_load_dotenv()


def normalize_mongodb_uri(database_url: str) -> str:
    """Normalize legacy MongoDB URLs into a consistent URI shape."""
    if database_url.startswith(("mongodb://", "mongodb+srv://")):
        return database_url
    if database_url.startswith("mongo://"):
        return database_url.replace("mongo://", "mongodb://", 1)
    return database_url


# Prefer MONGODB_URI, but keep DATABASE_URL as a compatibility fallback.
MONGODB_URI = normalize_mongodb_uri(
    os.getenv("MONGODB_URI")
    or os.getenv("DATABASE_URL")
    or "mongodb://localhost:27017/contract_engine"
)
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME")


client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000, tz_aware=False)


def get_database() -> Database:
    """Return the configured MongoDB database."""
    if MONGODB_DB_NAME:
        return client[MONGODB_DB_NAME]

    try:
        return client.get_default_database()
    except ConfigurationError:
        return client["contract_engine"]


def get_db() -> Generator[Database, None, None]:
    """Yield a MongoDB database handle for request-scoped dependencies."""
    yield get_database()


def get_next_sequence(db: Database, name: str) -> int:
    """Return the next integer sequence value for a named collection."""
    result = db["counters"].find_one_and_update(
        {"_id": name},
        {"$inc": {"seq": 1}, "$setOnInsert": {"seq": 0}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    return int(result["seq"])


def ensure_indexes(db: Database | None = None) -> None:
    """Create the MongoDB indexes used by the API."""
    database = db or get_database()

    database["contract_documents"].create_index([("id", 1)], unique=True)
    database["contract_documents"].create_index([("upload_timestamp", -1), ("id", -1)])

    database["sla_extractions"].create_index([("document_id", 1)], unique=True)
    database["analysis_reports"].create_index([("document_id", 1)], unique=True)
    database["user_accounts"].create_index([("id", 1)], unique=True)
    database["user_accounts"].create_index([("email", 1)], unique=True)
    database["counters"].create_index([("_id", 1)], unique=True)

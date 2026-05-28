"""Copy contract_engine data from a local SQLite database into MongoDB."""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

from pymongo import MongoClient
from pymongo.errors import ConfigurationError
from sqlalchemy import MetaData, Table, create_engine, select

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from database import MONGODB_URI, normalize_mongodb_uri


TABLE_COPY_ORDER = [
    "contract_documents",
    "user_accounts",
    "sla_extractions",
    "analysis_reports",
]


def _coerce_json(value):
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return value
    return value


def _coerce_datetime(value):
    if isinstance(value, datetime) or value is None:
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            return value
    return value


def _read_sqlite_rows(source_url: str) -> dict[str, list[dict]]:
    source_engine = create_engine(source_url)
    metadata = MetaData()
    tables = {name: Table(name, metadata, autoload_with=source_engine) for name in TABLE_COPY_ORDER}

    rows_by_table: dict[str, list[dict]] = {}
    with source_engine.begin() as conn:
        for name in TABLE_COPY_ORDER:
            table = tables[name]
            rows = conn.execute(select(table)).mappings().all()
            converted_rows: list[dict] = []
            for row in rows:
                document = dict(row)
                for key in ("created_at", "updated_at", "upload_timestamp"):
                    if key in document:
                        document[key] = _coerce_datetime(document[key])
                for key in ("extracted_json", "report_json"):
                    if key in document:
                        document[key] = _coerce_json(document[key])
                converted_rows.append(document)
            rows_by_table[name] = converted_rows

    return rows_by_table


def migrate_database(source_url: str, target_url: str, replace_existing: bool = False) -> None:
    """Copy rows from the SQLite source database into MongoDB collections."""
    normalized_target_url = normalize_mongodb_uri(target_url)
    client = MongoClient(normalized_target_url, serverSelectionTimeoutMS=5000, tz_aware=False)

    try:
        target_db = client.get_default_database()
    except ConfigurationError:
        target_db = client["contract_engine"]

    rows_by_table = _read_sqlite_rows(source_url)

    if replace_existing:
        for collection_name in TABLE_COPY_ORDER + ["counters"]:
            target_db[collection_name].delete_many({})
    else:
        for collection_name in TABLE_COPY_ORDER:
            if target_db[collection_name].estimated_document_count() > 0:
                raise RuntimeError(
                    "Target database already contains data. Re-run with --replace-existing to overwrite it."
                )

    for collection_name in TABLE_COPY_ORDER:
        rows = rows_by_table.get(collection_name, [])
        if rows:
            target_db[collection_name].insert_many(rows)

    for collection_name in TABLE_COPY_ORDER:
        rows = rows_by_table.get(collection_name, [])
        max_id = max((row.get("id", 0) for row in rows), default=0)
        target_db["counters"].update_one(
            {"_id": collection_name},
            {"$set": {"seq": max_id}},
            upsert=True,
        )


def main() -> None:
    """Parse CLI arguments and run the migration."""
    parser = argparse.ArgumentParser(
        description="Copy SQLite contract_engine data into MongoDB.",
    )
    parser.add_argument(
        "--source-url",
        default=os.getenv("SQLITE_SOURCE_URL", "sqlite:///./contract_engine.db"),
        help="SQLite source database URL.",
    )
    parser.add_argument(
        "--target-url",
        default=os.getenv("MONGODB_URI") or os.getenv("DATABASE_URL") or MONGODB_URI,
        help="Target MongoDB URI. Defaults to MONGODB_URI.",
    )
    parser.add_argument(
        "--replace-existing",
        action="store_true",
        help="Delete any existing rows in the target collections before copying.",
    )
    args = parser.parse_args()

    migrate_database(args.source_url, args.target_url, replace_existing=args.replace_existing)
    print("Migration completed successfully.")


if __name__ == "__main__":
    main()
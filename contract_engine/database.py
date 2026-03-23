"""Database configuration module for the Contract Analysis Engine."""

import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy import inspect as sqlalchemy_inspect
from sqlalchemy import text
from sqlalchemy.orm import declarative_base, sessionmaker

# Load environment variables from a local .env file.
load_dotenv()

# SQLite is used by default to keep local setup simple for beginners.
# You can set PostgreSQL in .env with:
# DATABASE_URL=postgresql+psycopg2://username:password@localhost:5432/contract_engine
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./contract_engine.db")

# The engine is the core SQLAlchemy interface to the database.
# `check_same_thread=False` is required only when using SQLite with FastAPI.
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

# SessionLocal creates independent database sessions for each request.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base is inherited by SQLAlchemy models.
Base = declarative_base()


def get_db():
    """Yield a database session for each request and ensure cleanup."""
    db = SessionLocal()
    try:
        # Provide the session to route handlers.
        yield db
    finally:
        # Always close the session to release DB resources.
        db.close()


# SQLite development can easily end up with a stale schema when the app evolves.
# This app uses `Base.metadata.create_all()` without migrations, so we ensure
# analysis-related columns exist before endpoints query the table.
def ensure_analysis_reports_schema() -> None:
    """Best-effort schema compatibility for `analysis_reports` on SQLite."""
    # Only SQLite supports the PRAGMA + ALTER TABLE flow used here.
    if getattr(engine.dialect, "name", "").lower() != "sqlite":
        return

    # Fast path: if table doesn't exist yet, `create_all()` will handle it.
    insp = sqlalchemy_inspect(engine)
    if not insp.has_table("analysis_reports"):
        return

    with engine.connect() as conn:
        rows = conn.execute(text("PRAGMA table_info(analysis_reports)")).fetchall()

    existing_columns = {row[1] for row in rows if len(row) > 1}

    required = {
        "user_id": "INTEGER",
        "contract_text": "TEXT",
        "pdf_path": "VARCHAR(512)",
        "fairness_score": "FLOAT",
    }

    missing = [name for name in required.keys() if name not in existing_columns]
    if not missing:
        return

    with engine.begin() as conn:
        for name in missing:
            conn.execute(text(f"ALTER TABLE analysis_reports ADD COLUMN {name} {required[name]}"))

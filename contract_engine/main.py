"""FastAPI entrypoint for the Contract Analysis Engine."""

import argparse
import logging
import os
import socket

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect as sqlalchemy_inspect
from sqlalchemy import text

from database import Base, engine
from routers import analysis, auth, chat, contracts, extraction, upload, vehicle
from routers import report as report_router

# Configure app-wide logging so errors are visible in console and deployment logs.
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")


# Create all SQLAlchemy tables on startup for quick local setup.
# In production, use migrations (Alembic) for schema versioning.
Base.metadata.create_all(bind=engine)

# SQLite development databases can lag behind model changes.
# This project uses `create_all()` (no migrations), so we do a minimal,
# safe compatibility check to prevent runtime crashes.
def _ensure_analysis_reports_columns() -> None:
    # Only SQLite supports the PRAGMA + ALTER TABLE flow used here.
    if getattr(engine.dialect, "name", "").lower() != "sqlite":
        return
    insp = sqlalchemy_inspect(engine)
    if not insp.has_table("analysis_reports"):
        return

    # PRAGMA table_info returns: cid, name, type, notnull, dflt_value, pk
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

    # SQLite: add missing columns without needing to rebuild the table.
    with engine.begin() as conn:
        for name in missing:
            conn.execute(text(f"ALTER TABLE analysis_reports ADD COLUMN {name} {required[name]}"))


_ensure_analysis_reports_columns()

app = FastAPI(
    title="Contract Analysis Engine",
    description="Uploads contracts, extracts OCR text, parses SLA fields with LLM, and decodes VINs.",
    version="2.0.0",
)

# Allow the React dev server (and any local origin) to call the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def health_check():
    """Simple health endpoint to confirm the API server is running."""
    return {"status": "ok", "message": "Contract Analysis Engine is running."}


# Include feature routers under /api prefix for clean proxy setup.
app.include_router(upload.router, prefix="/api")
app.include_router(extraction.router, prefix="/api")
app.include_router(vehicle.router, prefix="/api")
app.include_router(analysis.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(contracts.router, prefix="/api")
app.include_router(report_router.router, prefix="/api")

# Ensure reports directory exists for PDF storage.
REPORTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "reports")
os.makedirs(REPORTS_DIR, exist_ok=True)


def _find_available_port(host: str, preferred_port: int, max_offset: int = 20) -> int:
    """Return the first available TCP port starting from preferred_port."""
    for offset in range(max_offset + 1):
        candidate = preferred_port + offset
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            try:
                sock.bind((host, candidate))
                return candidate
            except OSError:
                continue

    raise RuntimeError(
        f"No free port found in range {preferred_port}-{preferred_port + max_offset} for host {host}."
    )


def run_server() -> None:
    """Run the FastAPI application with optional host/port CLI flags."""
    parser = argparse.ArgumentParser(
        description="Run the Contract Analysis Engine API server.",
    )
    parser.add_argument("file", nargs="?", help="Optional file path (not used directly).")
    parser.add_argument("--host", default="127.0.0.1", help="Host for Uvicorn server.")
    parser.add_argument("--port", type=int, default=8000, help="Port for Uvicorn server.")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload for development.")
    args = parser.parse_args()

    # If a file path is provided, explain the correct API flow for beginners.
    if args.file:
        logging.getLogger(__name__).info(
            "Received file argument '%s'. Start server first, then upload via POST /api/upload-contract.",
            args.file,
        )

    selected_port = _find_available_port(args.host, args.port)
    if selected_port != args.port:
        logging.getLogger(__name__).warning(
            "Port %s is already in use. Starting server on port %s instead.",
            args.port,
            selected_port,
        )

    uvicorn.run("main:app", host=args.host, port=selected_port, reload=args.reload)


if __name__ == "__main__":
    """Allow `python main.py` to start the API server directly."""
    run_server()

"""Lightweight record shapes used by the MongoDB-backed API."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict


@dataclass
class ContractDocument:
    id: int | None = None
    filename: str = ""
    extracted_text: str = ""
    upload_timestamp: datetime = field(default_factory=datetime.utcnow)


@dataclass
class SLAExtraction:
    id: int | None = None
    document_id: int = 0
    extracted_json: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class UserAccount:
    id: int | None = None
    full_name: str = ""
    email: str = ""
    password_hash: str = ""
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class AnalysisReport:
    id: int | None = None
    document_id: int = 0
    user_id: int | None = None
    report_json: Dict[str, Any] = field(default_factory=dict)
    contract_text: str | None = None
    pdf_path: str | None = None
    fairness_score: float | None = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

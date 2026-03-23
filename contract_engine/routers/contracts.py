"""Router for contract history, details, deletion, and multi-deal comparison."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from database import ensure_analysis_reports_schema
from models import AnalysisReport, ContractDocument, SLAExtraction
from services.analysis_service import build_detailed_report

router = APIRouter(tags=["Contracts"])


class CompareContractsRequest(BaseModel):
    """Input payload listing contract document IDs to compare."""

    contract_ids: List[int] = Field(default_factory=list)


def _serialize_contract(
    document: ContractDocument,
    sla_record: SLAExtraction | None,
    analysis_record: AnalysisReport | None,
) -> Dict[str, Any]:
    """Normalize a contract row into frontend-consumable shape."""
    sla_json = sla_record.extracted_json if sla_record and isinstance(sla_record.extracted_json, dict) else None

    analysis_json = (
        analysis_record.report_json
        if analysis_record and isinstance(analysis_record.report_json, dict)
        else None
    )

    score_data = analysis_json
    if score_data is None and sla_json:
        score_data = build_detailed_report(
            sla_data=sla_json,
            market_data={},
            issues=[],
            negotiation_suggestions=[],
        )

    return {
        "id": document.id,
        "document_id": document.id,
        "filename": document.filename,
        "uploaded_at": document.upload_timestamp.isoformat() if isinstance(document.upload_timestamp, datetime) else None,
        "analyzed": bool(analysis_json or sla_json),
        "sla": sla_json,
        "analysis_report": analysis_json,
        "deal_score": (score_data.get("deal_score") if isinstance(score_data, dict) else None)
        or (score_data.get("overall_score") if isinstance(score_data, dict) else None),
        "deal_category": (score_data.get("deal_category") if isinstance(score_data, dict) else None),
    }


@router.get("/contracts")
def list_contracts(db: Session = Depends(get_db)) -> Dict[str, List[Dict[str, Any]]]:
    """Return all uploaded contracts with optional SLA data for history views."""
    # Repair SQLite schema if the table is missing recently-added columns.
    ensure_analysis_reports_schema()

    documents = (
        db.query(ContractDocument)
        .order_by(ContractDocument.upload_timestamp.desc(), ContractDocument.id.desc())
        .all()
    )

    contract_ids = [doc.id for doc in documents]
    sla_rows = (
        db.query(SLAExtraction)
        .filter(SLAExtraction.document_id.in_(contract_ids))
        .all()
        if contract_ids
        else []
    )
    analysis_rows = (
        db.query(AnalysisReport)
        .filter(AnalysisReport.document_id.in_(contract_ids))
        .all()
        if contract_ids
        else []
    )
    sla_by_document_id = {row.document_id: row for row in sla_rows}
    analysis_by_document_id = {row.document_id: row for row in analysis_rows}

    return {
        "contracts": [
            _serialize_contract(
                doc,
                sla_by_document_id.get(doc.id),
                analysis_by_document_id.get(doc.id),
            )
            for doc in documents
        ]
    }


@router.get("/contracts/{document_id}")
def get_contract(document_id: int, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Return one contract with SLA details if available."""
    document = db.query(ContractDocument).filter(ContractDocument.id == document_id).first()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found.")

    sla_record = db.query(SLAExtraction).filter(SLAExtraction.document_id == document_id).first()
    analysis_record = db.query(AnalysisReport).filter(AnalysisReport.document_id == document_id).first()
    return _serialize_contract(document, sla_record, analysis_record)


@router.delete("/contracts/{document_id}")
def delete_contract(document_id: int, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Delete contract and linked SLA extraction data."""
    document = db.query(ContractDocument).filter(ContractDocument.id == document_id).first()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found.")

    db.query(AnalysisReport).filter(AnalysisReport.document_id == document_id).delete()
    db.query(SLAExtraction).filter(SLAExtraction.document_id == document_id).delete()
    db.delete(document)
    db.commit()

    return {"deleted": True, "document_id": document_id}


@router.post("/compare")
def compare_contracts(body: CompareContractsRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Compare multiple contracts and rank by score with good/mid/bad categories."""
    if len(body.contract_ids) > 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A maximum of 6 contracts can be compared.")

    ids = list(dict.fromkeys(body.contract_ids))
    if len(ids) < 2:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least 2 unique contracts are required.")

    documents = db.query(ContractDocument).filter(ContractDocument.id.in_(ids)).all()
    docs_by_id = {doc.id: doc for doc in documents}

    missing_ids = [doc_id for doc_id in ids if doc_id not in docs_by_id]
    if missing_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Contract(s) not found: {missing_ids}",
        )

    sla_rows = db.query(SLAExtraction).filter(SLAExtraction.document_id.in_(ids)).all()
    analysis_rows = db.query(AnalysisReport).filter(AnalysisReport.document_id.in_(ids)).all()
    sla_by_document_id = {row.document_id: row for row in sla_rows if isinstance(row.extracted_json, dict)}
    analysis_by_document_id = {row.document_id: row for row in analysis_rows if isinstance(row.report_json, dict)}

    deals: List[Dict[str, Any]] = []
    for doc_id in ids:
        document = docs_by_id[doc_id]
        sla_json = sla_by_document_id.get(doc_id).extracted_json if doc_id in sla_by_document_id else {}
        report = analysis_by_document_id.get(doc_id)
        report_json = report.report_json if report else None
        if not isinstance(report_json, dict):
            report_json = build_detailed_report(
                sla_data=sla_json,
                market_data={},
                issues=[],
                negotiation_suggestions=[],
            )

        deals.append(
            {
                "document_id": doc_id,
                "filename": document.filename,
                "score": report_json.get("deal_score") or report_json.get("overall_score"),
                "category": report_json.get("deal_category"),
                "sla": sla_json,
                "score_breakdown": report_json.get("score_breakdown"),
                "sla_completeness": report_json.get("sla_completeness"),
                "analysis_report": report_json,
            }
        )

    ranked = sorted(deals, key=lambda item: item["score"], reverse=True)

    return {
        "best_deal": ranked[0] if ranked else None,
        "ranked_deals": ranked,
        "deals": deals,
    }

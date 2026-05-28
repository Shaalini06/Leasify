"""Router for contract history, details, deletion, and multi-deal comparison."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from database import get_db
from services.analysis_service import build_detailed_report

router = APIRouter(tags=["Contracts"])


class CompareContractsRequest(BaseModel):
    """Input payload listing contract document IDs to compare."""

    contract_ids: List[int] = Field(default_factory=list)


def _serialize_contract(
    document: Dict[str, Any],
    sla_record: Dict[str, Any] | None,
    analysis_record: Dict[str, Any] | None,
) -> Dict[str, Any]:
    """Normalize a contract row into frontend-consumable shape."""
    sla_json = sla_record.get("extracted_json") if sla_record and isinstance(sla_record.get("extracted_json"), dict) else None

    analysis_json = (
        analysis_record.get("report_json")
        if analysis_record and isinstance(analysis_record.get("report_json"), dict)
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

    uploaded_at = document.get("upload_timestamp")

    return {
        "id": document["id"],
        "document_id": document["id"],
        "filename": document["filename"],
        "uploaded_at": uploaded_at.isoformat() if isinstance(uploaded_at, datetime) else None,
        "analyzed": bool(analysis_json or sla_json),
        "sla": sla_json,
        "analysis_report": analysis_json,
        "deal_score": (score_data.get("deal_score") if isinstance(score_data, dict) else None)
        or (score_data.get("overall_score") if isinstance(score_data, dict) else None),
        "deal_category": (score_data.get("deal_category") if isinstance(score_data, dict) else None),
    }


@router.get("/contracts")
def list_contracts(db: Any = Depends(get_db)) -> Dict[str, List[Dict[str, Any]]]:
    """Return all uploaded contracts with optional SLA data for history views."""
    documents = list(db["contract_documents"].find().sort([("upload_timestamp", -1), ("id", -1)]))

    contract_ids = [doc["id"] for doc in documents]
    sla_rows = list(db["sla_extractions"].find({"document_id": {"$in": contract_ids}})) if contract_ids else []
    analysis_rows = list(db["analysis_reports"].find({"document_id": {"$in": contract_ids}})) if contract_ids else []
    sla_by_document_id = {row["document_id"]: row for row in sla_rows}
    analysis_by_document_id = {row["document_id"]: row for row in analysis_rows}

    return {
        "contracts": [
            _serialize_contract(
                doc,
                sla_by_document_id.get(doc["id"]),
                analysis_by_document_id.get(doc["id"]),
            )
            for doc in documents
        ]
    }


@router.get("/contracts/{document_id}")
def get_contract(document_id: int, db: Any = Depends(get_db)) -> Dict[str, Any]:
    """Return one contract with SLA details if available."""
    document = db["contract_documents"].find_one({"id": document_id})
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found.")

    sla_record = db["sla_extractions"].find_one({"document_id": document_id})
    analysis_record = db["analysis_reports"].find_one({"document_id": document_id})
    return _serialize_contract(document, sla_record, analysis_record)


@router.delete("/contracts/{document_id}")
def delete_contract(document_id: int, db: Any = Depends(get_db)) -> Dict[str, Any]:
    """Delete contract and linked SLA extraction data."""
    document = db["contract_documents"].find_one({"id": document_id})
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found.")

    db["analysis_reports"].delete_many({"document_id": document_id})
    db["sla_extractions"].delete_many({"document_id": document_id})
    db["contract_documents"].delete_many({"id": document_id})

    return {"deleted": True, "document_id": document_id}


@router.post("/compare")
def compare_contracts(body: CompareContractsRequest, db: Any = Depends(get_db)) -> Dict[str, Any]:
    """Compare multiple contracts and rank by score with good/mid/bad categories."""
    if len(body.contract_ids) > 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A maximum of 6 contracts can be compared.")

    ids = list(dict.fromkeys(body.contract_ids))
    if len(ids) < 2:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least 2 unique contracts are required.")

    documents = list(db["contract_documents"].find({"id": {"$in": ids}}))
    docs_by_id = {doc["id"]: doc for doc in documents}

    missing_ids = [doc_id for doc_id in ids if doc_id not in docs_by_id]
    if missing_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Contract(s) not found: {missing_ids}",
        )

    sla_rows = list(db["sla_extractions"].find({"document_id": {"$in": ids}}))
    analysis_rows = list(db["analysis_reports"].find({"document_id": {"$in": ids}}))
    sla_by_document_id = {row["document_id"]: row for row in sla_rows if isinstance(row.get("extracted_json"), dict)}
    analysis_by_document_id = {row["document_id"]: row for row in analysis_rows if isinstance(row.get("report_json"), dict)}

    deals: List[Dict[str, Any]] = []
    for doc_id in ids:
        document = docs_by_id[doc_id]
        sla_json = sla_by_document_id.get(doc_id).get("extracted_json") if doc_id in sla_by_document_id else {}
        report = analysis_by_document_id.get(doc_id)
        report_json = report.get("report_json") if report else None
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
                "filename": document["filename"],
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

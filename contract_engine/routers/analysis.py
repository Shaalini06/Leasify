"""Router for contract risk analysis and car market price verification."""

import logging
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

from database import get_db
from models import ContractDocument, SLAExtraction
from services.analysis_service import analyze_contract_terms, build_market_fallback, fetch_vehicle_market_data
from services.vin_service import get_vehicle_details

router = APIRouter(tags=["Contract Analysis"])
logger = logging.getLogger(__name__)


@router.post("/analyze-contract/{document_id}")
async def analyze_contract(document_id: int, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Analyze SLA and vehicle data for financing risk and negotiation opportunities."""
    try:
        # Step 1: Ensure the source document exists.
        document = db.query(ContractDocument).filter(ContractDocument.id == document_id).first()
        if not document:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

        # Step 2: Fetch extracted SLA JSON for the document.
        sla_record = db.query(SLAExtraction).filter(SLAExtraction.document_id == document_id).first()
        if not sla_record or not isinstance(sla_record.extracted_json, dict):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="SLA data not found. Please run SLA extraction first.",
            )

        sla_data: Dict[str, Any] = sla_record.extracted_json

        # Step 3: VIN is required to resolve vehicle details.
        vin = str(sla_data.get("vin", "") or "").strip()
        if not vin:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="VIN is missing in extracted SLA data. Cannot run contract analysis.",
            )

        # Step 4: Decode VIN for make/model/year.
        vehicle_data = await run_in_threadpool(get_vehicle_details, vin)

        # Step 5: Lookup market data from CarQuery using VIN-decoded details.
        try:
            market_data = await run_in_threadpool(
                fetch_vehicle_market_data,
                vehicle_data.get("make", ""),
                vehicle_data.get("model", ""),
                vehicle_data.get("model_year", ""),
            )
        except Exception as market_error:
            # Continue analysis even if market API fails; only market-price-based checks are skipped.
            logger.warning("CarQuery lookup failed for document_id=%s: %s", document_id, market_error)
            market_data = build_market_fallback(
                vehicle_data.get("make", ""),
                vehicle_data.get("model", ""),
                vehicle_data.get("model_year", ""),
            )

        # Step 6: Apply rule-based risk analysis and return structured JSON.
        result = analyze_contract_terms(
            sla_data=sla_data,
            vehicle_data=vehicle_data,
            market_data=market_data,
            contract_text=document.extracted_text or "",
        )

        return result
    except HTTPException:
        # Re-raise explicit API errors without modification.
        raise
    except ValueError as error:
        logger.error("Contract analysis validation error for document_id=%s: %s", document_id, error)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
    except Exception as error:
        logger.exception("Unexpected contract analysis error for document_id=%s", document_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze contract risk.",
        ) from error

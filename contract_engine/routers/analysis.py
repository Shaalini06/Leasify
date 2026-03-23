"""Router for contract risk analysis and car market price verification."""

import logging
import re
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

from database import get_db
from database import ensure_analysis_reports_schema
from models import AnalysisReport, ContractDocument, SLAExtraction
from services.analysis_service import analyze_contract_terms, build_market_fallback, fetch_vehicle_market_data
from services.vin_service import get_vehicle_details

router = APIRouter(tags=["Contract Analysis"])
logger = logging.getLogger(__name__)


@router.post("/analyze-contract/{document_id}")
async def analyze_contract(document_id: int, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Analyze SLA and vehicle data for financing risk and negotiation opportunities."""
    try:
        # Repair SQLite schema if the table is missing recently-added columns.
        ensure_analysis_reports_schema()

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

        # Step 3: VIN is optional for baseline analysis; vehicle decode is best-effort.
        raw_vin = str(sla_data.get("vin", "") or "").strip()
        vin = re.sub(r"[^A-Za-z0-9]", "", raw_vin).upper()
        vehicle_data: Dict[str, Any] = {
            "vin": vin,
            "make": "",
            "model": "",
            "model_year": "",
        }
        vin_status = "missing"

        if vin:
            if len(vin) != 17:
                vin_status = "invalid"
                logger.info(
                    "VIN format invalid for document_id=%s (len=%s). Continuing analysis without VIN decode.",
                    document_id,
                    len(vin),
                )
            else:
                try:
                    # Step 4: Decode VIN for make/model/year.
                    decoded_vehicle_data = await run_in_threadpool(get_vehicle_details, vin)
                    if isinstance(decoded_vehicle_data, dict):
                        vehicle_data.update(decoded_vehicle_data)
                        vin_status = "valid"
                except Exception as decode_error:
                    vin_status = "decode_failed"
                    logger.warning(
                        "VIN decode request failed for document_id=%s (vin=%s): %s. Continuing analysis.",
                        document_id,
                        vin,
                        decode_error,
                    )
        else:
            logger.info("Skipping VIN decode for document_id=%s because VIN is missing.", document_id)

        # Step 5: Lookup market data from CarQuery using VIN-decoded details.
        make = vehicle_data.get("make", "")
        model = vehicle_data.get("model", "")
        model_year = vehicle_data.get("model_year", "")

        if str(make or "").strip() and str(model or "").strip() and str(model_year or "").strip():
            try:
                market_data = await run_in_threadpool(
                    fetch_vehicle_market_data,
                    make,
                    model,
                    model_year,
                )
            except Exception as market_error:
                # Continue analysis even if market API fails.
                logger.warning("CarQuery lookup failed for document_id=%s: %s", document_id, market_error)
                market_data = build_market_fallback(make, model, model_year)
        else:
            logger.info(
                "Skipping CarQuery lookup for document_id=%s due to incomplete vehicle decode.",
                document_id,
            )
            market_data = build_market_fallback(make, model, model_year)

        # Step 6: Apply rule-based risk analysis and return structured JSON.
        result = analyze_contract_terms(
            sla_data=sla_data,
            vehicle_data=vehicle_data,
            market_data=market_data,
            contract_text=document.extracted_text or "",
        )

        # Add VIN status and vehicle data to result
        result["vin_status"] = vin_status
        result["vehicle_data"] = vehicle_data
        result["sla_data"] = sla_data

        # Persist latest analysis/report output so history can read from DB directly.
        existing_report = db.query(AnalysisReport).filter(AnalysisReport.document_id == document_id).first()
        if existing_report:
            existing_report.report_json = result
            existing_report.contract_text = document.extracted_text or ""
            existing_report.fairness_score = result.get("deal_score")
            db.add(existing_report)
        else:
            db.add(AnalysisReport(
                document_id=document_id,
                report_json=result,
                contract_text=document.extracted_text or "",
                fairness_score=result.get("deal_score"),
            ))

        db.commit()

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

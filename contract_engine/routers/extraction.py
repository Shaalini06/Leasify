"""Router for SLA extraction using stored OCR text and OpenRouter."""

import logging
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool

from database import get_db, get_next_sequence
from schemas import SLAExtractionResponse, SLAFields
from services.llm_service import extract_sla_with_openrouter

router = APIRouter(tags=["SLA Extraction"])
logger = logging.getLogger(__name__)


@router.post("/extract-sla/{document_id}", response_model=SLAExtractionResponse)
async def extract_sla(document_id: int, db: Any = Depends(get_db)):
    """Extract SLA fields from stored OCR text using OpenRouter and save JSON output."""
    try:
        # Fetch source document from DB so extraction always uses stored OCR text.
        document = db["contract_documents"].find_one({"id": document_id})
        if not document:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

        if not str(document.get("extracted_text", "")).strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Document has no extracted text available for SLA extraction.",
            )

        # Run external LLM call in threadpool because requests is synchronous.
        sla_data = await run_in_threadpool(extract_sla_with_openrouter, document["extracted_text"])

        # Upsert behavior: update existing SLA row if present, otherwise create one.
        slas = db["sla_extractions"]
        existing = slas.find_one({"document_id": document_id})
        if existing:
            slas.update_one(
                {"document_id": document_id},
                {"$set": {"extracted_json": sla_data}},
            )
        else:
            slas.insert_one(
                {
                    "id": get_next_sequence(db, "sla_extractions"),
                    "document_id": document_id,
                    "extracted_json": sla_data,
                    "created_at": datetime.utcnow(),
                }
            )

        return SLAExtractionResponse(document_id=document_id, sla_data=SLAFields(**sla_data))
    except ValueError as error:
        logger.error("SLA extraction validation error: %s", error)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
    except HTTPException:
        # Re-raise explicit API errors without modification.
        raise
    except Exception as error:
        logger.exception("Unexpected error during SLA extraction")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to extract SLA details.",
        ) from error

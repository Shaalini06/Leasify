"""Router for the Negotiation Assistant chatbot endpoint."""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models import SLAExtraction
from services.chat_service import get_negotiation_advice

router = APIRouter(tags=["Negotiation Assistant"])
logger = logging.getLogger(__name__)


# ── Request / Response schemas ────────────────────────────────────────────

class ChatRequest(BaseModel):
    """Input schema for a negotiation assistant message."""
    message: str = Field(..., min_length=1, description="The user's question or message.")
    document_id: Optional[int] = Field(
        default=None,
        description="Optional contract ID. When provided, assistant uses extracted SLA context.",
    )


class ChatResponse(BaseModel):
    """Output schema containing the AI-generated reply."""
    reply: str


# ── Endpoint ──────────────────────────────────────────────────────────────

@router.post("/negotiation-assistant", response_model=ChatResponse)
async def negotiation_assistant(body: ChatRequest, db: Session = Depends(get_db)):
    """Accept a user question and return AI advice with optional contract context."""
    try:
        # Step 1: Use SLA context only when a contract is explicitly provided.
        sla_data: dict = {}
        if body.document_id is not None:
            sla_record = (
                db.query(SLAExtraction)
                .filter(SLAExtraction.document_id == body.document_id)
                .first()
            )
            if not sla_record or not isinstance(sla_record.extracted_json, dict):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Contract SLA data not found. Please extract SLA first.",
                )
            sla_data = sla_record.extracted_json

        # Step 2: Call LLM in a threadpool (requests is synchronous).
        reply = await run_in_threadpool(get_negotiation_advice, sla_data, body.message)

        # Step 3: Return structured response.
        return ChatResponse(reply=reply)

    except HTTPException:
        # Re-raise explicit API errors without modification.
        raise
    except ValueError as error:
        logger.error("Chat validation error: %s", error)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
    except Exception as error:
        logger.exception("Unexpected error in negotiation assistant")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate negotiation advice.",
        ) from error

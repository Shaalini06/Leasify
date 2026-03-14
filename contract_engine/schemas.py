"""Pydantic schemas for API validation and response formatting."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class SLAFields(BaseModel):
    """Schema representing the required SLA fields from the LLM output."""

    apr: str = Field(default="")
    loan_term: str = Field(default="")
    monthly_payment: str = Field(default="")
    total_payment: str = Field(default="")
    due_date: str = Field(default="")
    lender_name: str = Field(default="")
    borrower_name: str = Field(default="")
    vin: str = Field(default="")


class SignupRequest(BaseModel):
    """Input payload for user registration."""

    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=1)


class LoginRequest(BaseModel):
    """Input payload for user login."""

    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=1)


class AuthUser(BaseModel):
    """Safe user shape returned to the frontend."""

    id: int
    email: str
    full_name: str


class AuthResponse(BaseModel):
    """Authentication response containing a token and current user."""

    token: str
    user: AuthUser


class VerifyTokenResponse(BaseModel):
    """Response payload for explicit token verification endpoint."""

    valid: bool
    user: AuthUser


class UploadContractResponse(BaseModel):
    """Response schema returned after OCR upload processing."""

    document_id: int
    filename: str
    extracted_text: str
    upload_timestamp: datetime


class SLAExtractionResponse(BaseModel):
    """Response schema returned after LLM SLA extraction."""

    document_id: int
    sla_data: SLAFields


class VehicleDetailsResponse(BaseModel):
    """Response schema for normalized NHTSA VIN lookup details."""

    vin: str
    make: str
    model: str
    model_year: str
    recalls: Any = None

"""VIN service for vehicle detail lookup using NHTSA VPIC API."""

import os
from typing import Any, Dict

import requests
from dotenv import load_dotenv

# Load environment variables from a local .env file.
load_dotenv()

# NHTSA API base URL placeholder (kept explicit per project requirement).
NHTSA_API_URL = os.getenv(
    "NHTSA_API_URL",
    "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/",
)


def get_vehicle_details(vin: str) -> Dict[str, Any]:
    """Fetch and normalize vehicle details for a VIN from the NHTSA API."""
    clean_vin = (vin or "").strip().upper()

    # VINs are expected to be exactly 17 characters for standard decoding.
    if len(clean_vin) != 17:
        raise ValueError("VIN must be exactly 17 characters.")

    # Build URL exactly as required by NHTSA documentation.
    request_url = f"{NHTSA_API_URL}{clean_vin}?format=json"

    # Send the API request with timeout to avoid indefinite waits.
    response = requests.get(request_url, timeout=30)
    response.raise_for_status()

    payload = response.json()
    results = payload.get("Results", [])
    if not results:
        raise ValueError("No vehicle details found for this VIN.")

    item = results[0]

    # NHTSA may return structured decode warnings/errors even when HTTP is 200.
    # Treat non-zero-only error codes as lookup failures.
    raw_error_code = str(item.get("ErrorCode", "") or "")
    error_codes = [code.strip() for code in raw_error_code.split(",") if code.strip()]
    has_decode_error = bool(error_codes) and "0" not in error_codes
    error_text = str(item.get("ErrorText", "") or "").strip()

    make = item.get("Make", "") or ""
    model = item.get("Model", "") or ""
    model_year = item.get("ModelYear", "") or ""

    if not any([make.strip(), model.strip(), model_year.strip()]):
        if has_decode_error:
            raise ValueError(error_text or "NHTSA could not decode this VIN.")
        raise ValueError("No vehicle details found for this VIN.")

    # Extract only required fields to keep response clean and predictable.
    return {
        "vin": clean_vin,
        "make": make,
        "model": model,
        "model_year": model_year,
        "recalls": item.get("Recalls") if item.get("Recalls") else None,
    }

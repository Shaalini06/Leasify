"""Service layer for contract risk analysis and vehicle market price verification."""

from __future__ import annotations

import re
from statistics import mean
from typing import Any, Dict, List, Optional

import requests

CARQUERY_API_URL = "https://www.carqueryapi.com/api/0.3/"


def _extract_first_number(value: Any) -> Optional[float]:
    """Extract the first numeric value from a string like '$450.00' or '7.5%'."""
    if value is None:
        return None

    text = str(value).strip().replace(",", "")
    if not text:
        return None

    match = re.search(r"-?\d+(?:\.\d+)?", text)
    if not match:
        return None

    try:
        return float(match.group(0))
    except ValueError:
        return None


def _normalize_year(year_value: Any) -> str:
    """Return a clean 4-digit year string when available, else empty string."""
    year_num = _extract_first_number(year_value)
    if year_num is None:
        return ""

    year_int = int(year_num)
    if 1900 <= year_int <= 2100:
        return str(year_int)

    return ""


def _extract_json_object(raw_text: str) -> Dict[str, Any]:
    """CarQuery can return wrapped text, so safely extract the JSON object portion."""
    start = raw_text.find("{")
    end = raw_text.rfind("}")

    if start == -1 or end == -1 or end <= start:
        raise ValueError("CarQuery API returned an unexpected response format.")

    json_like = raw_text[start : end + 1]

    # requests can parse this because the core section is valid JSON.
    try:
        return requests.models.complexjson.loads(json_like)
    except Exception as error:
        raise ValueError("Unable to parse CarQuery response as JSON.") from error


def fetch_vehicle_market_data(make: str, model: str, year: str) -> Dict[str, Any]:
    """Fetch trim/price information from CarQuery and estimate market price."""
    clean_make = (make or "").strip()
    clean_model = (model or "").strip()
    clean_year = _normalize_year(year)

    if not clean_make or not clean_model or not clean_year:
        raise ValueError("Vehicle make, model, and year are required for market price lookup.")

    params = {
        "cmd": "getTrims",
        "make": clean_make,
        "model": clean_model,
        "year": clean_year,
    }

    response = requests.get(CARQUERY_API_URL, params=params, timeout=30)
    response.raise_for_status()

    payload = _extract_json_object(response.text)
    trims = payload.get("Trims", [])

    # Pull numeric trim prices and ignore blank/zero values.
    trim_prices: List[float] = []
    for trim in trims:
        price = _extract_first_number(trim.get("model_price_usd"))
        if price and price > 0:
            trim_prices.append(price)

    min_price = min(trim_prices) if trim_prices else None
    max_price = max(trim_prices) if trim_prices else None
    avg_price = mean(trim_prices) if trim_prices else None

    return {
        "make": clean_make,
        "model": clean_model,
        "year": clean_year,
        "estimated_market_price": round(avg_price, 2) if avg_price is not None else None,
        "estimated_market_price_min": round(min_price, 2) if min_price is not None else None,
        "estimated_market_price_max": round(max_price, 2) if max_price is not None else None,
        "trim_count": len(trims),
    }


def _find_contract_price(sla_data: Dict[str, Any]) -> Optional[float]:
    """Look for likely contract price fields in SLA data."""
    candidate_fields = [
        "contract_price",
        "vehicle_price",
        "cash_price",
        "sale_price",
        "purchase_price",
        "price",
        "total_payment",
    ]

    for field_name in candidate_fields:
        value = _extract_first_number(sla_data.get(field_name))
        if value is not None and value > 0:
            return value

    return None


def _detect_penalty_clause(sla_data: Dict[str, Any], contract_text: str = "") -> bool:
    """Check SLA fields and optional contract text for risky penalty language."""
    keywords = [
        "penalty",
        "prepayment penalty",
        "late fee",
        "default fee",
        "default charge",
        "balloon payment",
        "repossession",
        "hidden fee",
        "collection fee",
    ]

    searchable_parts: List[str] = [str(value) for value in sla_data.values() if value is not None]
    if contract_text:
        searchable_parts.append(contract_text)

    combined_text = " ".join(searchable_parts).lower()
    return any(keyword in combined_text for keyword in keywords)


def _build_risk_level(issue_count: int) -> str:
    """Convert number of detected issues into a simple Low/Medium/High risk level."""
    if issue_count >= 3:
        return "High"
    if issue_count >= 1:
        return "Medium"
    return "Low"


def analyze_contract_terms(
    sla_data: Dict[str, Any],
    vehicle_data: Dict[str, Any],
    market_data: Dict[str, Any],
    contract_text: str = "",
) -> Dict[str, Any]:
    """Apply rule-based checks and return contract risk findings with suggestions."""
    issues: List[str] = []
    negotiation_suggestions: List[str] = []

    apr_value = _extract_first_number(sla_data.get("apr"))
    loan_term_months = _extract_first_number(sla_data.get("loan_term"))
    monthly_payment = _extract_first_number(sla_data.get("monthly_payment"))
    contract_price = _find_contract_price(sla_data)
    estimated_market_price = market_data.get("estimated_market_price")

    # Rule 1: High APR
    if apr_value is not None and apr_value > 7:
        issues.append("High interest rate")
        negotiation_suggestions.append("Ask dealer to reduce APR below 6%")

    # Rule 2: Long loan duration
    if loan_term_months is not None and loan_term_months > 72:
        issues.append("Long loan duration")
        negotiation_suggestions.append("Negotiate a shorter loan term (72 months or less)")

    # Rule 3: Monthly payment too high relative to market price
    # Simple threshold: monthly payment over 3% of market value is treated as high.
    if (
        monthly_payment is not None
        and isinstance(estimated_market_price, (int, float))
        and estimated_market_price > 0
        and monthly_payment > (estimated_market_price * 0.03)
    ):
        issues.append("High monthly payment")
        negotiation_suggestions.append("Request lower monthly payment or better financing terms")

    # Rule 4: Contract price is more than 10% above estimated market price
    if (
        contract_price is not None
        and isinstance(estimated_market_price, (int, float))
        and estimated_market_price > 0
        and contract_price > (estimated_market_price * 1.10)
    ):
        issues.append("Vehicle overpriced")
        negotiation_suggestions.append("Request vehicle price discount closer to market value")

    # Rule 5: Penalties or hidden clauses exist
    if _detect_penalty_clause(sla_data, contract_text):
        issues.append("Risky penalty clause")
        negotiation_suggestions.append("Ask dealer to remove or soften penalty/hidden fee clauses")

    # Remove duplicate suggestions while preserving order.
    unique_suggestions = list(dict.fromkeys(negotiation_suggestions))

    vehicle_market_data = {
        "make": vehicle_data.get("make", "") or "",
        "model": vehicle_data.get("model", "") or "",
        "year": vehicle_data.get("model_year", "") or market_data.get("year", ""),
        "estimated_market_price": estimated_market_price,
    }

    return {
        "risk_level": _build_risk_level(len(issues)),
        "issues": issues,
        "negotiation_suggestions": unique_suggestions,
        "vehicle_market_data": vehicle_market_data,
    }


def build_market_fallback(make: str = "", model: str = "", year: str = "") -> Dict[str, Any]:
    """Return a safe fallback market structure when lookup fails."""
    return {
        "make": (make or "").strip(),
        "model": (model or "").strip(),
        "year": _normalize_year(year),
        "estimated_market_price": None,
        "estimated_market_price_min": None,
        "estimated_market_price_max": None,
        "trim_count": 0,
    }

"""Service layer for contract risk analysis and vehicle market price verification."""

from __future__ import annotations

import json
import logging
import re
import time
from statistics import mean
from typing import Any, Dict, List, Optional, Tuple

import requests

logger = logging.getLogger(__name__)

CARQUERY_API_URL = "https://www.carqueryapi.com/api/0.3/"

# Retry configuration for market API
MAX_RETRIES = 3
RETRY_BACKOFF_SECONDS = 1.0


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
    stripped = (raw_text or "").strip()
    if not stripped:
        raise ValueError("CarQuery API returned an empty response.")

    # First try plain JSON payloads.
    try:
        parsed = json.loads(stripped)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass

    # Then try wrapped/JSONP-like payloads by extracting the first JSON object block.
    start = raw_text.find("{")
    end = raw_text.rfind("}")

    if start == -1 or end == -1 or end <= start:
        raise ValueError("CarQuery API returned an unexpected response format.")

    json_like = raw_text[start : end + 1]

    try:
        return json.loads(json_like)
    except Exception as error:
        raise ValueError("Unable to parse CarQuery response as JSON.") from error


def _market_data_fallback(make: str, model: str, year: str) -> Dict[str, Any]:
    """Provide a safe market payload when external lookup is unavailable."""
    return {
        "make": (make or "").strip(),
        "model": (model or "").strip(),
        "year": _normalize_year(year),
        "estimated_market_price": None,
        "estimated_market_price_min": None,
        "estimated_market_price_max": None,
        "trim_count": 0,
    }


def fetch_vehicle_market_data(make: str, model: str, year: str) -> Dict[str, Any]:
    """Fetch trim/price information from CarQuery with retry logic and content validation."""
    clean_make = (make or "").strip()
    clean_model = (model or "").strip()
    clean_year = _normalize_year(year)

    if not clean_make or not clean_model or not clean_year:
        return _market_data_fallback(clean_make, clean_model, clean_year)

    params = {
        "cmd": "getTrims",
        "make": clean_make,
        "model": clean_model,
        "year": clean_year,
    }

    last_error = None
    for attempt in range(MAX_RETRIES):
        try:
            response = requests.get(CARQUERY_API_URL, params=params, timeout=30)
            response.raise_for_status()

            # Validate content-type: CarQuery may return HTML instead of JSON.
            content_type = str(response.headers.get("content-type", "")).lower()
            response_text = response.text or ""

            if "text/html" in content_type or response_text.lstrip().startswith("<"):
                logger.warning(
                    "CarQuery returned HTML instead of JSON (attempt %d/%d) for %s %s %s",
                    attempt + 1, MAX_RETRIES, clean_make, clean_model, clean_year,
                )
                last_error = "HTML response received"
                if attempt < MAX_RETRIES - 1:
                    time.sleep(RETRY_BACKOFF_SECONDS * (attempt + 1))
                continue

            try:
                payload = _extract_json_object(response_text)
            except ValueError as parse_err:
                logger.warning(
                    "CarQuery JSON parse failed (attempt %d/%d): %s",
                    attempt + 1, MAX_RETRIES, parse_err,
                )
                last_error = str(parse_err)
                if attempt < MAX_RETRIES - 1:
                    time.sleep(RETRY_BACKOFF_SECONDS * (attempt + 1))
                continue

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

        except requests.RequestException as req_err:
            logger.warning(
                "CarQuery network error (attempt %d/%d): %s",
                attempt + 1, MAX_RETRIES, req_err,
            )
            last_error = str(req_err)
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_BACKOFF_SECONDS * (attempt + 1))

    # All retries exhausted — return fallback, never crash
    logger.warning("CarQuery lookup failed after %d attempts: %s", MAX_RETRIES, last_error)
    return _market_data_fallback(clean_make, clean_model, clean_year)


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


def _detect_penalty_clause(sla_data: Dict[str, Any], contract_text: str = "") -> List[str]:
    """Check SLA fields and optional contract text for risky penalty/fee language.

    Returns a list of matched keyword phrases (empty list means nothing risky detected).
    """
    keywords = [
        # Keep these specific to reduce false positives like "no prepayment penalty".
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
    return [keyword for keyword in keywords if keyword in combined_text]


def _detect_good_clauses(sla_data: Dict[str, Any], contract_text: str = "") -> List[str]:
    """Detect positive contract aspects for GREEN highlighting in the UI."""
    good_clauses: List[str] = []

    apr_value = _extract_first_number(sla_data.get("apr"))
    if apr_value is not None and apr_value <= 5:
        good_clauses.append("Competitive APR rate (≤5%)")

    term_value = _extract_first_number(sla_data.get("loan_term"))
    if term_value is not None and term_value <= 60:
        good_clauses.append("Reasonable loan term (≤60 months)")

    combined_text = " ".join(str(v) for v in sla_data.values() if v).lower()
    if contract_text:
        combined_text += " " + contract_text.lower()

    if "no prepayment penalty" in combined_text or "without penalty" in combined_text:
        good_clauses.append("No prepayment penalty")

    if "warranty" in combined_text:
        good_clauses.append("Warranty coverage included")

    if "gap insurance" in combined_text or "gap coverage" in combined_text:
        good_clauses.append("GAP insurance/coverage mentioned")

    # Additional positive signals that often correlate with more favorable terms.
    if "grace period" in combined_text:
        good_clauses.append("Payment grace period mentioned")

    if "fixed" in combined_text and ("apr" in combined_text or "interest rate" in combined_text):
        good_clauses.append("Fixed APR / fixed interest rate mentioned")

    if "no balloon payment" in combined_text or "without balloon payment" in combined_text:
        good_clauses.append("No balloon payment stated")

    # Completeness bonus
    present, total = _completeness_ratio(sla_data)
    if present == total:
        good_clauses.append("All required SLA fields are present")

    return good_clauses


def _build_risk_level(issue_count: int) -> str:
    """Convert number of detected issues into a simple Low/Medium/High risk level."""
    if issue_count >= 3:
        return "High"
    if issue_count >= 1:
        return "Medium"
    return "Low"


def _clamp_score(value: float, min_value: int = 0, max_value: int = 100) -> int:
    """Clamp numeric score into the configured score range."""
    return int(max(min_value, min(max_value, round(value))))


def _deal_category_from_score(score: int) -> str:
    """Map score into normalized deal quality buckets used in UI color-coding."""
    if score >= 75:
        return "good"
    if score >= 50:
        return "mid"
    return "bad"


def _completeness_ratio(sla_data: Dict[str, Any]) -> Tuple[int, int]:
    """Return (present_count, total_count) for required SLA fields."""
    required_fields = [
        "apr",
        "loan_term",
        "monthly_payment",
        "total_payment",
        "due_date",
        "lender_name",
        "borrower_name",
        "vin",
    ]
    present = 0
    for field in required_fields:
        value = str(sla_data.get(field, "") or "").strip()
        if value:
            present += 1
    return present, len(required_fields)


def _missing_required_fields(sla_data: Dict[str, Any]) -> List[str]:
    """Return a list of missing required SLA field names."""
    required_fields = [
        "apr",
        "loan_term",
        "monthly_payment",
        "total_payment",
        "due_date",
        "lender_name",
        "borrower_name",
        "vin",
    ]
    missing: List[str] = []
    for field in required_fields:
        value = str(sla_data.get(field, "") or "").strip()
        if not value:
            missing.append(field)
    return missing


def _extract_income_from_contract_text(contract_text: str = "") -> Optional[float]:
    """Best-effort extraction of monthly income from contract text.

    Only extracts when common income labels are present near a number
    (e.g. "annual income" / "monthly income").
    """
    if not contract_text:
        return None

    text = contract_text.lower()

    annual_match = re.search(
        r"(annual|yearly)\s+income[^0-9$]{0,30}\$?\s*([0-9][0-9,]*(?:\.\d+)?)",
        text,
    )
    if annual_match:
        annual_income = _extract_first_number(annual_match.group(2))
        if annual_income is not None and annual_income > 0:
            return annual_income / 12.0

    monthly_match = re.search(
        r"(monthly)\s+income[^0-9$]{0,30}\$?\s*([0-9][0-9,]*(?:\.\d+)?)",
        text,
    )
    if monthly_match:
        monthly_income = _extract_first_number(monthly_match.group(2))
        if monthly_income is not None and monthly_income > 0:
            return monthly_income

    return None


def _build_verdict(score: int, category: str, issues: List[str], good_clauses: List[str]) -> str:
    """Build a human-readable verdict summarizing the deal quality."""
    if category == "good":
        verdict = f"This is a GOOD deal with a fairness score of {score}/100."
        if good_clauses:
            verdict += f" Positive aspects include: {', '.join(good_clauses[:3])}."
        if issues:
            verdict += f" Minor concerns: {', '.join(issues[:2])}."
        else:
            verdict += " No significant risks were detected."
    elif category == "mid":
        verdict = f"This deal is FAIR with a score of {score}/100."
        if issues:
            verdict += f" Issues to negotiate: {', '.join(issues[:3])}."
        verdict += " Consider negotiating better terms before signing."
    else:
        verdict = f"⚠️ This is a POOR deal with a score of {score}/100."
        if issues:
            verdict += f" Critical issues: {', '.join(issues[:3])}."
        verdict += " We strongly recommend negotiating or seeking alternative offers."

    return verdict


def build_detailed_report(
    sla_data: Dict[str, Any],
    market_data: Dict[str, Any],
    issues: List[str],
    negotiation_suggestions: List[str],
) -> Dict[str, Any]:
    """Build a score-based report with breakdown sections for UI visualization."""
    apr_value = _extract_first_number(sla_data.get("apr"))
    term_value = _extract_first_number(sla_data.get("loan_term"))
    monthly_value = _extract_first_number(sla_data.get("monthly_payment"))
    total_value = _extract_first_number(sla_data.get("total_payment"))

    estimated_market_price = market_data.get("estimated_market_price")
    contract_price = _find_contract_price(sla_data)

    financing_score = 20.0
    if apr_value is not None:
        if apr_value > 12:
            financing_score -= 14
        elif apr_value > 9:
            financing_score -= 10
        elif apr_value > 7:
            financing_score -= 7
        elif apr_value > 5:
            financing_score -= 3

    term_score = 20.0
    if term_value is not None:
        if term_value > 84:
            term_score -= 12
        elif term_value > 72:
            term_score -= 8
        elif term_value > 60:
            term_score -= 4

    pricing_score = 20.0
    if isinstance(estimated_market_price, (int, float)) and estimated_market_price > 0 and contract_price is not None:
        ratio = contract_price / estimated_market_price
        if ratio > 1.2:
            pricing_score -= 14
        elif ratio > 1.1:
            pricing_score -= 10
        elif ratio > 1.05:
            pricing_score -= 5

    payment_score = 20.0
    if monthly_value is not None and isinstance(estimated_market_price, (int, float)) and estimated_market_price > 0:
        payment_ratio = monthly_value / estimated_market_price
        if payment_ratio > 0.04:
            payment_score -= 12
        elif payment_ratio > 0.03:
            payment_score -= 8
        elif payment_ratio > 0.025:
            payment_score -= 4

    clause_score = max(0.0, 20.0 - (len(issues) * 4.0))

    present_fields, total_fields = _completeness_ratio(sla_data)
    completeness_pct = round((present_fields / total_fields) * 100, 2) if total_fields else 0.0

    base_score = financing_score + term_score + pricing_score + payment_score + clause_score
    if completeness_pct < 70:
        base_score -= 8
    elif completeness_pct < 85:
        base_score -= 4

    overall_score = _clamp_score(base_score)
    category = _deal_category_from_score(overall_score)

    return {
        "overall_score": overall_score,
        "deal_category": category,
        "score_breakdown": {
            "financing_cost": {
                "label": "Financing Cost (APR)",
                "score": _clamp_score(financing_score, 0, 20),
                "max_score": 20,
                "value": apr_value,
            },
            "loan_term_health": {
                "label": "Loan Term Health",
                "score": _clamp_score(term_score, 0, 20),
                "max_score": 20,
                "value": term_value,
            },
            "pricing_fairness": {
                "label": "Pricing Fairness",
                "score": _clamp_score(pricing_score, 0, 20),
                "max_score": 20,
                "value": contract_price,
                "market": estimated_market_price,
            },
            "payment_burden": {
                "label": "Monthly Payment Burden",
                "score": _clamp_score(payment_score, 0, 20),
                "max_score": 20,
                "value": monthly_value,
            },
            "clause_safety": {
                "label": "Clause Safety",
                "score": _clamp_score(clause_score, 0, 20),
                "max_score": 20,
                "issues_detected": len(issues),
            },
        },
        "sla_completeness": {
            "present_fields": present_fields,
            "total_fields": total_fields,
            "completion_percent": completeness_pct,
        },
        "detailed_findings": [
            f"APR extracted as {apr_value if apr_value is not None else 'N/A'}.",
            f"Loan term extracted as {term_value if term_value is not None else 'N/A'} months.",
            f"Monthly payment extracted as {monthly_value if monthly_value is not None else 'N/A'}.",
            f"Total payment extracted as {total_value if total_value is not None else 'N/A'}.",
            f"Detected {len(issues)} risk issue(s) from pricing, payment, and clauses.",
            f"Generated {len(negotiation_suggestions)} negotiation suggestion(s).",
        ],
    }


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
    total_payment = _extract_first_number(sla_data.get("total_payment"))
    contract_price = _find_contract_price(sla_data)
    estimated_market_price = market_data.get("estimated_market_price")
    missing_fields = _missing_required_fields(sla_data)

    # Rule 1: High APR
    if apr_value is not None and apr_value > 7:
        issues.append(
            f"High APR of {apr_value:.2f}% (above 7% benchmark; typical new-car APR is often ~5-6%)"
        )
        negotiation_suggestions.append(f"Your APR is sitting at {apr_value:.2f}%. See if they'll come down closer to 6%—most dealers can work with that.")

    # Rule 2: Long loan duration
    if loan_term_months is not None and loan_term_months > 72:
        issues.append(f"Long loan term of {loan_term_months:.0f} months (above 72-month benchmark)")
        negotiation_suggestions.append(
            f"That's a pretty long loan term at {loan_term_months:.0f} months. See if shortening it to 60-72 months saves you meaningful interest."
        )

    # Rule 3: Monthly payment too high relative to market price
    if (
        monthly_payment is not None
        and isinstance(estimated_market_price, (int, float))
        and estimated_market_price > 0
        and monthly_payment > (estimated_market_price * 0.03)
    ):
        market_payment_benchmark = estimated_market_price * 0.03
        issues.append(
            "High monthly payment"
            f": ${monthly_payment:.0f} vs market benchmark (~${market_payment_benchmark:.0f}/mo at 3% of market)"
        )
        negotiation_suggestions.append(
            f"Your monthly payment looks a bit high at ${monthly_payment:.0f}. Try adjusting the APR or term—or see if there's room to bring down the financed amount."
        )

    # Rule 4: Contract price is more than 10% above estimated market price
    if (
        contract_price is not None
        and isinstance(estimated_market_price, (int, float))
        and estimated_market_price > 0
        and contract_price > (estimated_market_price * 1.10)
    ):
        over_pct = ((contract_price / estimated_market_price) - 1.0) * 100.0
        diff = contract_price - estimated_market_price
        issues.append(
            f"Vehicle price appears high: ${contract_price:.0f} vs est. market ${estimated_market_price:.0f} (~{over_pct:.0f}% above market)"
        )
        negotiation_suggestions.append(
            f"The car's priced about ${diff:.0f} above market. Worth a conversation with the dealer about bringing it closer to that estimated value."
        )

    # Rule 5: Missing SLA fields warning (affects scoring accuracy)
    if missing_fields:
        issues.append(f"Missing SLA fields detected: {', '.join(missing_fields)}")
        negotiation_suggestions.append(
            "A few details are missing from your contract—get those from the dealer so we can give you a more complete picture."
        )

    # Rule 6: Total financing cost seems high relative to vehicle price
    if (
        total_payment is not None
        and contract_price is not None
        and contract_price > 0
        and total_payment > 0
    ):
        total_cost_ratio = total_payment / contract_price
        if total_cost_ratio > 1.35:
            issues.append(
                f"Total financing cost is high: total payment ${total_payment:.0f} vs vehicle price ${contract_price:.0f} (≈{total_cost_ratio*100:.0f}% of price)"
            )
            negotiation_suggestions.append(
                "You're spending a fair bit on interest and fees overall. Ask for the breakdown and explore options like a higher down payment or shorter loan period to cut costs."
            )

    # Rule 7: Payment-to-income ratio guidance (best-effort)
    estimated_monthly_income = _extract_income_from_contract_text(contract_text)
    if (
        monthly_payment is not None
        and estimated_monthly_income is not None
        and estimated_monthly_income > 0
        and monthly_payment > 0
    ):
        payment_to_income = monthly_payment / estimated_monthly_income
        # Rough affordability benchmark; not a strict underwriting rule.
        if payment_to_income > 0.36:
            issues.append(
                f"Payment-to-income looks high: payment ${monthly_payment:.0f}/mo vs estimated income ${estimated_monthly_income:.0f}/mo (ratio {payment_to_income:.2f}; benchmark <= 0.36)"
            )
            negotiation_suggestions.append(
                "That monthly payment takes up a chunk of your income. Try tweaking the APR, term, or getting a bigger down payment to make it more comfortable."
            )

    # Rule 8: Penalties or hidden fee clauses exist
    penalty_keywords = _detect_penalty_clause(sla_data, contract_text)
    if penalty_keywords:
        issues.append(f"Potential penalty/fee language found: {', '.join(penalty_keywords)}")
        negotiation_suggestions.append(
            "There's some penalty or fee language in here. Get a full fee breakdown and see if you can soften those clauses or remove them entirely."
        )

    # Detect positive aspects
    good_clauses = _detect_good_clauses(sla_data, contract_text)

    # Remove duplicate suggestions while preserving order.
    unique_suggestions = list(dict.fromkeys(negotiation_suggestions))

    vehicle_market_data = {
        "make": vehicle_data.get("make", "") or "",
        "model": vehicle_data.get("model", "") or "",
        "year": vehicle_data.get("model_year", "") or market_data.get("year", ""),
        "estimated_market_price": estimated_market_price,
        "estimated_market_price_min": market_data.get("estimated_market_price_min"),
        "estimated_market_price_max": market_data.get("estimated_market_price_max"),
    }

    detailed_report = build_detailed_report(
        sla_data=sla_data,
        market_data=market_data,
        issues=issues,
        negotiation_suggestions=unique_suggestions,
    )

    verdict = _build_verdict(
        detailed_report["overall_score"],
        detailed_report["deal_category"],
        issues,
        good_clauses,
    )

    # Human-readable summary for the UI (single paragraph).
    apr_part = f"APR={apr_value:.2f}%" if apr_value is not None else "APR=N/A"
    term_part = f"Term={loan_term_months:.0f} mo" if loan_term_months is not None else "Term=N/A"
    payment_part = (
        f"Payment=${monthly_payment:.0f}/mo" if monthly_payment is not None else "Payment=N/A"
    )
    benchmark_apr_part = "typical new-car APR ~5-6%"

    market_part = ""
    if (
        isinstance(estimated_market_price, (int, float))
        and estimated_market_price
        and estimated_market_price > 0
        and monthly_payment is not None
    ):
        market_benchmark = estimated_market_price * 0.03
        market_part = f" Market benchmark (3% of market): ~${market_benchmark:.0f}/mo."

    focus_part = f" Key focus: {', '.join(issues[:2])}." if issues else " No major risk flags detected."
    positives_part = f" Positives: {', '.join(good_clauses[:3])}." if good_clauses else ""

    summary_paragraph = (
        f"{detailed_report['deal_category'].upper()} deal (score {detailed_report['overall_score']}/100). "
        f"{apr_part} ({benchmark_apr_part}), {term_part}, and {payment_part}.{market_part}{focus_part}{positives_part}"
    )

    return {
        "risk_level": _build_risk_level(len(issues)),
        "issues": issues,
        "good_clauses": good_clauses,
        "negotiation_suggestions": unique_suggestions,
        "vehicle_market_data": vehicle_market_data,
        "deal_score": detailed_report["overall_score"],
        "deal_category": detailed_report["deal_category"],
        "score_breakdown": detailed_report["score_breakdown"],
        "sla_completeness": detailed_report["sla_completeness"],
        "detailed_findings": detailed_report["detailed_findings"],
        "verdict": verdict,
        "summary_paragraph": summary_paragraph,
    }


def build_market_fallback(make: str = "", model: str = "", year: str = "") -> Dict[str, Any]:
    """Return a safe fallback market structure when lookup fails."""
    return _market_data_fallback(make, model, year)

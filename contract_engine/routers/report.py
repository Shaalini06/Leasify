"""Router for PDF and JSON report generation."""

import logging
import os
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse

from database import get_db
from services.analysis_service import build_detailed_report

router = APIRouter(tags=["Reports"])
logger = logging.getLogger(__name__)

REPORTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "reports")


def _safe_str(value: Any, default: str = "N/A") -> str:
    """Convert any value to a safe display string."""
    if value is None:
        return default
    s = str(value).strip()
    return s if s else default


def _generate_pdf(document_id: int, filename: str, sla_data: dict, report_data: dict) -> str:
    """Generate a PDF report and return the file path."""
    from fpdf import FPDF

    os.makedirs(REPORTS_DIR, exist_ok=True)
    pdf_path = os.path.join(REPORTS_DIR, f"report_{document_id}.pdf")

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    # Title
    pdf.set_font("Helvetica", "B", 20)
    pdf.set_text_color(220, 38, 38)
    pdf.cell(0, 12, "Contract Analysis Report", ln=True, align="C")
    pdf.ln(4)

    # Document info
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 6, f"Document: {filename} | ID: {document_id}", ln=True, align="C")
    pdf.ln(8)

    # Fairness Score
    score = report_data.get("deal_score") or report_data.get("overall_score", "N/A")
    category = _safe_str(report_data.get("deal_category"), "N/A").upper()
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 10, f"Fairness Score: {score}/100 ({category})", ln=True, align="C")
    pdf.ln(6)

    # Verdict
    verdict = report_data.get("verdict", "")
    if verdict:
        pdf.set_font("Helvetica", "I", 10)
        pdf.set_text_color(60, 60, 60)
        pdf.multi_cell(0, 6, verdict)
        pdf.ln(4)

    # SLA Fields Table
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(220, 38, 38)
    pdf.cell(0, 8, "SLA Extracted Fields", ln=True)
    pdf.ln(2)

    sla_fields = [
        ("APR", sla_data.get("apr")),
        ("Loan Term", sla_data.get("loan_term")),
        ("Monthly Payment", sla_data.get("monthly_payment")),
        ("Total Payment", sla_data.get("total_payment")),
        ("Due Date", sla_data.get("due_date")),
        ("Lender", sla_data.get("lender_name")),
        ("Borrower", sla_data.get("borrower_name")),
        ("VIN", sla_data.get("vin")),
    ]

    pdf.set_font("Helvetica", "", 10)
    for label, value in sla_fields:
        pdf.set_text_color(80, 80, 80)
        pdf.cell(55, 7, f"{label}:", border=0)
        pdf.set_text_color(0, 0, 0)
        pdf.cell(0, 7, _safe_str(value), border=0, ln=True)

    pdf.ln(6)

    # Risks
    issues = report_data.get("issues", [])
    if issues:
        pdf.set_font("Helvetica", "B", 13)
        pdf.set_text_color(220, 38, 38)
        pdf.cell(0, 8, f"Risks Detected ({len(issues)})", ln=True)
        pdf.ln(2)
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(180, 30, 30)
        for issue in issues:
            pdf.cell(0, 6, f"  - {_safe_str(issue)}", ln=True)
        pdf.ln(4)

    # Good Clauses
    good_clauses = report_data.get("good_clauses", [])
    if good_clauses:
        pdf.set_font("Helvetica", "B", 13)
        pdf.set_text_color(22, 163, 74)
        pdf.cell(0, 8, f"Positive Aspects ({len(good_clauses)})", ln=True)
        pdf.ln(2)
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(22, 130, 60)
        for clause in good_clauses:
            pdf.cell(0, 6, f"  + {_safe_str(clause)}", ln=True)
        pdf.ln(4)

    # Market Comparison
    market = report_data.get("vehicle_market_data", {})
    if market and market.get("estimated_market_price"):
        pdf.set_font("Helvetica", "B", 13)
        pdf.set_text_color(220, 38, 38)
        pdf.cell(0, 8, "Market Price Comparison", ln=True)
        pdf.ln(2)
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(0, 0, 0)
        pdf.cell(0, 6, f"  Vehicle: {market.get('make', '')} {market.get('model', '')} {market.get('year', '')}", ln=True)
        pdf.cell(0, 6, f"  Estimated Market Price: ${market.get('estimated_market_price', 'N/A')}", ln=True)
        if market.get("estimated_market_price_min"):
            pdf.cell(0, 6, f"  Price Range: ${market['estimated_market_price_min']} - ${market.get('estimated_market_price_max', 'N/A')}", ln=True)
        pdf.ln(4)

    # Score Breakdown
    breakdown = report_data.get("score_breakdown", {})
    if breakdown:
        pdf.set_font("Helvetica", "B", 13)
        pdf.set_text_color(220, 38, 38)
        pdf.cell(0, 8, "Score Breakdown", ln=True)
        pdf.ln(2)
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(0, 0, 0)
        for key, item in breakdown.items():
            if isinstance(item, dict):
                label = item.get("label", key)
                sc = item.get("score", 0)
                mx = item.get("max_score", 20)
                pdf.cell(0, 6, f"  {label}: {sc}/{mx}", ln=True)
        pdf.ln(4)

    # Suggestions
    suggestions = report_data.get("negotiation_suggestions", [])
    if suggestions:
        pdf.set_font("Helvetica", "B", 13)
        pdf.set_text_color(220, 38, 38)
        pdf.cell(0, 8, "Negotiation Suggestions", ln=True)
        pdf.ln(2)
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(0, 0, 0)
        for idx, suggestion in enumerate(suggestions, 1):
            pdf.cell(0, 6, f"  {idx}. {_safe_str(suggestion)}", ln=True)
        pdf.ln(4)

    # Footer
    pdf.ln(8)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(150, 150, 150)
    pdf.cell(0, 5, "Generated by LEASIFY - Car Lease/Loan Contract Review AI", ln=True, align="C")

    pdf.output(pdf_path)
    return pdf_path


@router.get("/report/{document_id}")
def get_report(document_id: int, db: Any = Depends(get_db)) -> Dict[str, Any]:
    """Return JSON report data for a contract."""
    report = db["analysis_reports"].find_one({"document_id": document_id})
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")

    document = db["contract_documents"].find_one({"id": document_id})
    sla_record = db["sla_extractions"].find_one({"document_id": document_id})

    return {
        "document_id": document_id,
        "filename": document["filename"] if document else "Unknown",
        "sla_data": sla_record.get("extracted_json") if sla_record and isinstance(sla_record.get("extracted_json"), dict) else {},
        "report": report.get("report_json") if isinstance(report.get("report_json"), dict) else {},
        "pdf_path": report.get("pdf_path"),
    }


@router.get("/report/pdf/{document_id}")
def generate_pdf_report(document_id: int, db: Any = Depends(get_db)):
    """Generate and return a PDF report for the given document."""
    document = db["contract_documents"].find_one({"id": document_id})
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    sla_record = db["sla_extractions"].find_one({"document_id": document_id})
    sla_data = sla_record.get("extracted_json") if sla_record and isinstance(sla_record.get("extracted_json"), dict) else {}

    report = db["analysis_reports"].find_one({"document_id": document_id})
    report_data = report.get("report_json") if report and isinstance(report.get("report_json"), dict) else {}

    # If no report exists, build a basic one from SLA
    if not report_data and sla_data:
        report_data = build_detailed_report(
            sla_data=sla_data,
            market_data={},
            issues=[],
            negotiation_suggestions=[],
        )

    try:
        pdf_path = _generate_pdf(document_id, document["filename"], sla_data, report_data)

        # Save pdf_path to DB
        if report:
            db["analysis_reports"].update_one({"document_id": document_id}, {"$set": {"pdf_path": pdf_path}})

        return FileResponse(
            pdf_path,
            media_type="application/pdf",
            filename=f"LEASIFY_Report_{document['filename'].rsplit('.', 1)[0]}.pdf",
        )
    except Exception as error:
        logger.exception("PDF generation failed for document_id=%s", document_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate PDF report.",
        ) from error

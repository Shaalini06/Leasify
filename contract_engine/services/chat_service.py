"""Chat service for the Negotiation Assistant powered by OpenRouter LLM."""

import os
from typing import Dict

import requests
from dotenv import load_dotenv

# Load environment variables from a local .env file.
load_dotenv()

# Reuse the same OpenRouter credentials as the SLA service.
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "YOUR_OPENROUTER_API_KEY")
OPENROUTER_API_URL = os.getenv("OPENROUTER_API_URL", "https://openrouter.ai/api/v1/chat/completions")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")


def _build_negotiation_prompt(sla_data: Dict[str, str], user_message: str) -> str:
    """Build an LLM prompt for either contract-aware or general automotive guidance."""
    apr = sla_data.get("apr", "N/A") or "N/A"
    loan_term = sla_data.get("loan_term", "N/A") or "N/A"
    monthly_payment = sla_data.get("monthly_payment", "N/A") or "N/A"
    total_payment = sla_data.get("total_payment", "N/A") or "N/A"
    due_date = sla_data.get("due_date", "N/A") or "N/A"
    lender = sla_data.get("lender_name", "N/A") or "N/A"
    borrower = sla_data.get("borrower_name", "N/A") or "N/A"
    vin = sla_data.get("vin", "N/A") or "N/A"
    has_contract_context = bool(sla_data)

    mode_instructions = (
        "Mode: Contract-aware negotiation support. You have the customer's actual contract details. "
        "Use these fields directly for personalized, specific recommendations."
        if has_contract_context
        else (
            "Mode: General automotive assistant. No contract is loaded. "
            "Answer using general industry knowledge, average pricing, and best practices."
        )
    )

    context_block = (
        "Current contract details:\n"
        f"  APR: {apr}\n"
        f"  Loan term: {loan_term}\n"
        f"  Monthly payment: {monthly_payment}\n"
        f"  Total payment: {total_payment}\n"
        f"  Due date: {due_date}\n"
        f"  Lender: {lender}\n"
        f"  Borrower: {borrower}\n"
        f"  VIN: {vin}\n\n"
        if has_contract_context
        else "No contract details provided.\n\n"
    )

    return (
        "You are an expert car finance negotiation coach and automotive advisor.\n\n"
        f"{mode_instructions}\n\n"
        f"{context_block}"
        "Customer question:\n"
        f"{user_message}\n\n"
        "Provide a helpful, friendly, and actionable response."
    )


def get_negotiation_advice(sla_data: Dict[str, str], user_message: str) -> str:
    """Send the user's question together with SLA context to OpenRouter and return advice.

    Raises ValueError when the API key is missing or the response is malformed.
    Raises requests.RequestException on network / HTTP errors.
    """
    # Guard against unconfigured API key to give a clear error early.
    if OPENROUTER_API_KEY == "YOUR_OPENROUTER_API_KEY":
        raise ValueError("OpenRouter API key is not configured. Set OPENROUTER_API_KEY in .env.")

    prompt = _build_negotiation_prompt(sla_data, user_message)

    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are LEASIFY's built-in Car Finance Expert — a friendly, knowledgeable automotive "
                    "negotiation coach. You speak directly to the customer like a trusted friend giving advice over coffee.\n\n"
                    "Style guidelines:\n"
                    "- Keep it conversational and natural—like you're chatting, not lecturing\n"
                    "- Use simple, everyday language; skip the jargon\n"
                    "- Be encouraging but realistic\n"
                    "- Give specific numbers and practical next steps\n"
                    "- When they have a contract, reference their actual numbers\n"
                    "- Share exact phrases they can use with the dealer\n"
                    "- Advocate for them without being pushy\n"
                    "- Keep it crisp—get to the point quickly\n"
                    "- Avoid bullet points or formal lists unless it really helps clarity\n"
                    "- No hashtags or overly formal formatting"
                ),
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.3,
        "max_tokens": 800,
    }

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }

    # Timeout keeps the API responsive if OpenRouter is slow.
    response = requests.post(OPENROUTER_API_URL, headers=headers, json=payload, timeout=60)
    response.raise_for_status()

    data = response.json()

    # Navigate the chat-completion response safely.
    try:
        reply = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as error:
        raise ValueError("Unexpected response format from OpenRouter.") from error

    return reply.strip()

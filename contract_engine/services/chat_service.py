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
    """Build an LLM prompt that includes contract details and the user's question.

    The prompt instructs the model to act as a car-loan negotiation advisor and
    respond with short, actionable advice the user can take to the dealer.
    """
    apr = sla_data.get("apr", "N/A") or "N/A"
    loan_term = sla_data.get("loan_term", "N/A") or "N/A"
    monthly_payment = sla_data.get("monthly_payment", "N/A") or "N/A"
    total_payment = sla_data.get("total_payment", "N/A") or "N/A"

    return (
        "You are an expert car loan negotiation advisor.\n\n"
        "Contract details:\n"
        f"APR: {apr}\n"
        f"Loan term: {loan_term}\n"
        f"Monthly payment: {monthly_payment}\n"
        f"Total payment: {total_payment}\n\n"
        "User question:\n"
        f"{user_message}\n\n"
        "Provide short and practical negotiation advice that the user can use "
        "when speaking with the dealer."
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
                    "You are a helpful car loan negotiation assistant. "
                    "Always give concise, practical advice."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.7,
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

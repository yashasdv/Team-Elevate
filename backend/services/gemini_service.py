"""Gemini client helpers that return structured JSON payloads."""

import asyncio
import json
import os

from google import genai
from google.genai import types


def _generate_json_sync(prompt: str):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("Gemini is not configured")
    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.2,
        ),
    )
    if not response.text:
        raise RuntimeError("Gemini returned an empty response")
    return json.loads(response.text)


async def generate_json(prompt: str):
    """Run the synchronous Gemini SDK away from the event loop."""
    try:
        return await asyncio.to_thread(_generate_json_sync, prompt)
    except RuntimeError:
        raise
    except Exception as exc:
        raise RuntimeError("Gemini request failed") from exc

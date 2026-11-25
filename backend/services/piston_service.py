"""Async client for a Piston code execution API instance."""

import asyncio
import os
import time
from urllib.parse import urlparse

import httpx

PISTON_URL = os.getenv("PISTON_API_URL", "https://emkc.org/api/v2/piston").rstrip("/")
RUN_TIMEOUT_MS = 5000
MAX_PARALLEL_CASES = 4


class PistonAuthorizationError(RuntimeError):
    """Raised when the configured public Piston API lacks valid authorization."""


def _headers() -> dict[str, str]:
    token = os.getenv("PISTON_API_KEY")
    if not token and urlparse(PISTON_URL).hostname == "emkc.org":
        raise PistonAuthorizationError(
            "Piston authorization is required. Configure PISTON_API_KEY or use a self-hosted Piston URL."
        )
    return {"Authorization": token} if token else {}


async def _run_code(client: httpx.AsyncClient, code: str, stdin: str = "") -> dict:
    payload = {
        "language": "python",
        "version": os.getenv("PISTON_PYTHON_VERSION", "3.10.0"),
        "files": [{"name": "main.py", "content": code}],
        "stdin": stdin,
        "run_timeout": RUN_TIMEOUT_MS,
        "compile_timeout": RUN_TIMEOUT_MS,
    }
    headers = _headers()
    start = time.perf_counter()
    try:
        response = await client.post(f"{PISTON_URL}/execute", json=payload, headers=headers)
        response.raise_for_status()
    except httpx.TimeoutException as exc:
        raise RuntimeError("Code execution service timed out") from exc
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code in {401, 403}:
            raise PistonAuthorizationError("Piston authorization failed") from None
        raise RuntimeError("Code execution service returned an error") from None
    except httpx.HTTPError as exc:
        raise RuntimeError("Code execution service is unavailable") from exc

    try:
        result = response.json()
        run = result.get("run") or {}
    except (ValueError, AttributeError) as exc:
        raise RuntimeError("Code execution service returned an invalid response") from exc

    return {
        "stdout": run.get("stdout", ""),
        "stderr": run.get("stderr", ""),
        "exitCode": run.get("code"),
        "executionTime": round(time.perf_counter() - start, 4),
        "timedOut": run.get("signal") == "SIGKILL",
    }


async def run_code(code: str, stdin: str = "") -> dict:
    """Execute one Python program and normalize the Piston response."""
    async with httpx.AsyncClient(timeout=12.0) as client:
        return await _run_code(client, code, stdin)


async def run_against_test_cases(code: str, test_cases: list[dict]) -> list[dict]:
    """Run cases concurrently within a small bound; redact hidden-case output."""
    semaphore = asyncio.Semaphore(MAX_PARALLEL_CASES)
    async with httpx.AsyncClient(timeout=12.0) as client:
        async def run_case(index: int, case: dict) -> dict:
            async with semaphore:
                output = await _run_code(client, code, str(case.get("input", "")))
            expected = str(case.get("expected", case.get("expectedOutput", ""))).rstrip("\n")
            actual = output["stdout"].rstrip("\n")
            hidden = bool(case.get("isHidden", False))
            return {
                "passed": output["exitCode"] == 0 and actual == expected,
                "actualOutput": None if hidden else output["stdout"],
                "expectedOutput": None if hidden else expected,
                "isHidden": hidden,
                "testCaseIndex": index + 1,
                "stderr": None if hidden else output["stderr"],
                "timedOut": output["timedOut"],
            }

        return await asyncio.gather(*(
            run_case(index, case) for index, case in enumerate(test_cases)
        ))

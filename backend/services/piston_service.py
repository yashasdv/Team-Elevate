"""Async client for the Piston code execution API."""

import os

import httpx

PISTON_URL = os.getenv("PISTON_API_URL", "https://emkc.org/api/v2/piston")
RUN_TIMEOUT_MS = 5000


async def run_code(code: str, stdin: str = "") -> dict:
    """Execute one Python program and normalize the Piston response."""
    payload = {
        "language": "python",
        "version": os.getenv("PISTON_PYTHON_VERSION", "3.10.0"),
        "files": [{"name": "main.py", "content": code}],
        "stdin": stdin,
        "run_timeout": RUN_TIMEOUT_MS,
        "compile_timeout": RUN_TIMEOUT_MS,
    }
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            response = await client.post(f"{PISTON_URL}/execute", json=payload)
            response.raise_for_status()
    except httpx.TimeoutException as exc:
        raise RuntimeError("Code execution service timed out") from exc
    except httpx.HTTPStatusError as exc:
        raise RuntimeError("Code execution service returned an error") from exc
    except httpx.HTTPError as exc:
        raise RuntimeError("Code execution service is unavailable") from exc

    result = response.json()
    run = result.get("run") or {}
    return {
        "stdout": run.get("stdout", ""),
        "stderr": run.get("stderr", ""),
        "exitCode": run.get("code"),
        "executionTime": run.get("wall_time"),
        "timedOut": run.get("signal") == "SIGKILL",
    }


async def run_against_test_cases(code: str, test_cases: list[dict]) -> list[dict]:
    """Run code once for each supplied case and report output comparison."""
    results = []
    for index, case in enumerate(test_cases):
        output = await run_code(code, str(case.get("input", "")))
        expected = str(case.get("expected", case.get("expectedOutput", ""))).rstrip("\n")
        actual = output["stdout"].rstrip("\n")
        hidden = bool(case.get("isHidden", False))
        results.append({
            "passed": output["exitCode"] == 0 and actual == expected,
            "actualOutput": None if hidden else output["stdout"],
            "expectedOutput": None if hidden else expected,
            "isHidden": hidden,
            "testCaseIndex": index + 1,
            "stderr": output["stderr"],
            "timedOut": output["timedOut"],
        })
    return results

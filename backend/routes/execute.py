"""Authenticated code execution API route."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from routes.auth import get_current_user
from services.piston_service import run_against_test_cases, run_code

router = APIRouter()


class TestCase(BaseModel):
    input: str = ""
    expected: str | None = None
    expectedOutput: str | None = None
    isHidden: bool = False


class ExecuteRequest(BaseModel):
    code: str = Field(min_length=1, max_length=50000)
    stdin: str = Field(default="", max_length=10000)
    testCases: list[TestCase] = Field(default_factory=list, max_length=20)


@router.post("/execute", tags=["Code Execution"])
async def execute_code(
    request: ExecuteRequest,
    _current_user: dict[str, Any] = Depends(get_current_user),
):
    try:
        standalone_result = await run_code(request.code, request.stdin)
        test_results = []
        if request.testCases:
            test_cases = [case.model_dump(exclude_none=True) for case in request.testCases]
            test_results = await run_against_test_cases(request.code, test_cases)
        return {**standalone_result, "testResults": test_results}
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from None

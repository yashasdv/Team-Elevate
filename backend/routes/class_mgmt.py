"""Firestore backed class creation and membership routes."""

import secrets
import string
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from routes.auth import get_current_user
from services.firebase_service import get_firestore

router = APIRouter()
_CODE_ALPHABET = string.ascii_uppercase + string.digits


class CreateClassRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)


class JoinClassRequest(BaseModel):
    classCode: str = Field(min_length=6, max_length=16)


class ApproveRequest(BaseModel):
    classId: str = Field(min_length=1)
    studentId: str = Field(min_length=1)
    action: str = Field(pattern="^(approve|reject)$")


def _require_role(user: dict[str, Any], role: str) -> None:
    if user.get("role") != role:
        raise HTTPException(status_code=403, detail=f"{role.title()} role required")


def _make_class_code(name: str) -> str:
    prefix = "".join(char for char in name.split()[0].upper() if char.isalnum())[:5]
    prefix = prefix or "CLASS"
    suffix = "".join(secrets.choice(_CODE_ALPHABET) for _ in range(4))
    return f"{prefix}-{suffix}"


@router.post("/class/create", tags=["Classes"])
async def create_class(
    request: CreateClassRequest,
    user: dict[str, Any] = Depends(get_current_user),
):
    _require_role(user, "teacher")
    db = get_firestore()
    classes = db.collection("classes")
    class_id = classes.document().id
    code = _make_class_code(request.name)
    # Retry an unlikely random collision before writing the document.
    for _ in range(5):
        matches = list(classes.where("classCode", "==", code).limit(1).stream())
        if not matches:
            break
        code = _make_class_code(request.name)
    else:
        raise HTTPException(status_code=503, detail="Could not allocate a class code")

    classes.document(class_id).create({
        "name": request.name.strip(),
        "classCode": code,
        "teacherId": user["uid"],
        "studentIds": [],
        "pendingStudentIds": [],
    })
    return {"classId": class_id, "classCode": code}


@router.post("/class/join", tags=["Classes"])
async def join_class(
    request: JoinClassRequest,
    user: dict[str, Any] = Depends(get_current_user),
):
    _require_role(user, "student")
    db = get_firestore()
    matches = list(
        db.collection("classes")
        .where("classCode", "==", request.classCode.strip().upper())
        .limit(1)
        .stream()
    )
    if not matches:
        raise HTTPException(status_code=404, detail="Class code not found")

    class_doc = matches[0]
    data = class_doc.to_dict() or {}
    uid = user["uid"]
    if uid in data.get("studentIds", []):
        return {"status": "joined", "message": "You are already in this class."}
    if uid in data.get("pendingStudentIds", []):
        return {"status": "pending", "message": "Your join request is awaiting approval."}

    from firebase_admin import firestore
    class_doc.reference.update({"pendingStudentIds": firestore.ArrayUnion([uid])})
    return {"status": "pending", "message": "Join request sent. Waiting for teacher approval."}


@router.post("/class/approve", tags=["Classes"])
async def approve_student(
    request: ApproveRequest,
    user: dict[str, Any] = Depends(get_current_user),
):
    _require_role(user, "teacher")
    db = get_firestore()
    class_ref = db.collection("classes").document(request.classId)
    snapshot = class_ref.get()
    if not snapshot.exists:
        raise HTTPException(status_code=404, detail="Class not found")
    data = snapshot.to_dict() or {}
    if data.get("teacherId") != user["uid"]:
        raise HTTPException(status_code=403, detail="You do not own this class")
    if request.studentId not in data.get("pendingStudentIds", []):
        raise HTTPException(status_code=404, detail="Student join request not found")

    from firebase_admin import firestore
    updates = {"pendingStudentIds": firestore.ArrayRemove([request.studentId])}
    if request.action == "approve":
        updates["studentIds"] = firestore.ArrayUnion([request.studentId])
    class_ref.update(updates)
    return {"success": True}

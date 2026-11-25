"""Authentication dependencies and user profile routes."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth as firebase_auth
from pydantic import BaseModel, Field

from services.firebase_service import get_firestore, verify_id_token

router = APIRouter()
bearer_scheme = HTTPBearer(auto_error=False)


class ProfileRequest(BaseModel):
    displayName: str = Field(min_length=1, max_length=120)
    college: str = Field(default="", max_length=160)
    year: str = Field(default="", max_length=80)
    role: str | None = Field(default=None, pattern="^(student|teacher)$")


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, Any]:
    """Require and verify a Firebase Bearer ID token."""
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="A valid bearer token is required")
    try:
        claims = verify_id_token(credentials.credentials)
    except (firebase_auth.InvalidIdTokenError, firebase_auth.ExpiredIdTokenError,
            firebase_auth.RevokedIdTokenError, firebase_auth.UserDisabledError):
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token") from None
    except Exception:
        # Do not expose credential, SDK, or infrastructure details to API clients.
        raise HTTPException(status_code=401, detail="Unable to verify authentication token") from None

    role = claims.get("role")
    if role not in {"student", "teacher"}:
        # A server-managed profile can supply the role when no custom claim exists.
        try:
            profile = get_firestore().collection("users").document(claims["uid"]).get()
            role = (profile.to_dict() or {}).get("role") if profile.exists else None
        except Exception:
            role = None

    user = {"uid": claims["uid"], "role": role, "claims": claims}
    request.state.current_user = user
    return user


@router.post("/auth/profile", tags=["Auth"])
async def save_profile(
    profile: ProfileRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """Save user profile fields without allowing self-assignment of teacher access."""
    role = current_user.get("role")
    if role not in {"student", "teacher"}:
        role = "student"
    if profile.role == "teacher" and current_user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Teacher access must be assigned by an administrator")

    db = get_firestore()
    ref = db.collection("users").document(current_user["uid"])
    snapshot = ref.get()
    from firebase_admin import firestore
    values = {
        "displayName": profile.displayName.strip(),
        "college": profile.college.strip(),
        "year": profile.year.strip(),
        "role": role,
        "updatedAt": firestore.SERVER_TIMESTAMP,
    }
    if not snapshot.exists:
        values["createdAt"] = firestore.SERVER_TIMESTAMP
    ref.set(values, merge=True)
    return {"success": True, "uid": current_user["uid"], "role": role}


@router.get("/auth/profile", tags=["Auth"])
async def read_profile(current_user: dict[str, Any] = Depends(get_current_user)):
    """Return the authenticated user's verified identity and role."""
    return {"uid": current_user["uid"], "role": current_user["role"]}

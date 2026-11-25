"""Authentication dependencies and profile routes."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth as firebase_auth

from services.firebase_service import verify_id_token

router = APIRouter()
bearer_scheme = HTTPBearer(auto_error=False)


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

    user = {
        "uid": claims["uid"],
        "role": claims.get("role"),
        "claims": claims,
    }
    request.state.current_user = user
    return user


@router.get("/auth/profile", tags=["Auth"])
async def profile(current_user: dict[str, Any] = Depends(get_current_user)):
    """Return the authenticated user's verified identity and role claim."""
    return {"uid": current_user["uid"], "role": current_user["role"]}

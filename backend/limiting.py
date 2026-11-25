"""Rate limiting keyed by verified Firebase user identity."""

import os

from slowapi import Limiter
from slowapi.util import get_remote_address


def authenticated_user_key(request) -> str:
    user = getattr(request.state, "current_user", None)
    uid = user.get("uid") if isinstance(user, dict) else None
    return f"user:{uid}" if uid else get_remote_address(request)


limiter = Limiter(
    key_func=authenticated_user_key,
    storage_uri=os.getenv("RATELIMIT_STORAGE_URI", "memory://"),
    headers_enabled=True,
)

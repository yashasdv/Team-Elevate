"""Firebase Admin initialization and ID token verification."""

import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

import firebase_admin
from firebase_admin import auth, credentials


def _initialize_firebase() -> firebase_admin.App:
    """Initialize Firebase on first use, supporting JSON or file credentials."""
    existing = firebase_admin.get_app() if firebase_admin._apps else None
    if existing:
        return existing

    raw_credentials = os.getenv("FIREBASE_CREDENTIALS")
    credentials_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
    project_id = os.getenv("FIREBASE_PROJECT_ID")

    if raw_credentials:
        try:
            service_account = json.loads(raw_credentials)
        except json.JSONDecodeError as exc:
            raise RuntimeError("FIREBASE_CREDENTIALS must contain valid JSON") from exc
        credential = credentials.Certificate(service_account)
    elif credentials_path and Path(credentials_path).is_file():
        credential = credentials.Certificate(credentials_path)
    else:
        # Supports managed environments that provide Application Default Credentials.
        credential = credentials.ApplicationDefault()

    options = {"projectId": project_id} if project_id else None
    return firebase_admin.initialize_app(credential, options=options)


@lru_cache(maxsize=1)
def _firebase_app() -> firebase_admin.App:
    return _initialize_firebase()


def verify_id_token(token: str) -> dict[str, Any]:
    """Verify a Firebase ID token and return its decoded claims."""
    app = _firebase_app()
    return auth.verify_id_token(token, app=app, check_revoked=True)

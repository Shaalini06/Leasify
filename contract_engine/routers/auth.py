"""Router for signup/login endpoints used by the frontend."""

import base64
import hashlib
import hmac
import os
import time

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import UserAccount
from schemas import AuthResponse, AuthUser, LoginRequest, SignupRequest, VerifyTokenResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

AUTH_SECRET = os.getenv("AUTH_SECRET", "local-dev-auth-secret-change-me")
TOKEN_TTL_SECONDS = int(os.getenv("AUTH_TOKEN_TTL_SECONDS", str(7 * 24 * 60 * 60)))


def _hash_password(password: str) -> str:
    """Generate a salted PBKDF2 hash for password storage."""
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
    return base64.urlsafe_b64encode(salt + digest).decode("utf-8")


def _verify_password(password: str, encoded_hash: str) -> bool:
    """Verify a plaintext password against the stored PBKDF2 hash."""
    try:
        decoded = base64.urlsafe_b64decode(encoded_hash.encode("utf-8"))
        salt = decoded[:16]
        stored_digest = decoded[16:]
        computed_digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
        return hmac.compare_digest(stored_digest, computed_digest)
    except Exception:
        return False


def _create_token(user_id: int) -> str:
    """Create a signed bearer token with user id and issue timestamp."""
    issued_at = int(time.time())
    payload = f"{user_id}:{issued_at}"
    signature = hmac.new(AUTH_SECRET.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    token_value = f"{payload}:{signature}"
    return base64.urlsafe_b64encode(token_value.encode("utf-8")).decode("utf-8")


def _decode_token(token: str) -> int:
    """Validate token signature/age and return user id."""
    try:
        decoded = base64.urlsafe_b64decode(token.encode("utf-8")).decode("utf-8")
        user_id_str, issued_at_str, signature = decoded.split(":", 2)
        payload = f"{user_id_str}:{issued_at_str}"
        expected_signature = hmac.new(
            AUTH_SECRET.encode("utf-8"),
            payload.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        if not hmac.compare_digest(signature, expected_signature):
            raise ValueError("Invalid token signature")

        issued_at = int(issued_at_str)
        if int(time.time()) - issued_at > TOKEN_TTL_SECONDS:
            raise ValueError("Expired token")

        return int(user_id_str)
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
        ) from error


def _extract_bearer_token(authorization: str | None) -> str:
    """Extract a bearer token from the Authorization header."""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header is missing.",
        )

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header must be in 'Bearer <token>' format.",
        )

    return token.strip()


def _serialize_user(user: UserAccount) -> AuthUser:
    """Convert SQLAlchemy user model to API-safe user payload."""
    return AuthUser(id=user.id, email=user.email, full_name=user.full_name)


def _get_user_from_auth_header(authorization: str | None, db: Session) -> UserAccount:
    """Resolve the current user from Authorization header token."""
    token = _extract_bearer_token(authorization)
    user_id = _decode_token(token)
    user = db.query(UserAccount).filter(UserAccount.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found for token.")
    return user


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(body: SignupRequest, db: Session = Depends(get_db)) -> AuthResponse:
    """Create a new account and issue an auth token."""
    email = body.email.strip().lower()
    full_name = body.full_name.strip()

    if not email or not full_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email and full name are required.")

    existing = db.query(UserAccount).filter(UserAccount.email == email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user = UserAccount(email=email, full_name=full_name, password_hash=_hash_password(body.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    return AuthResponse(token=_create_token(user.id), user=_serialize_user(user))


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    """Authenticate a user and issue a fresh auth token."""
    email = body.email.strip().lower()
    user = db.query(UserAccount).filter(UserAccount.email == email).first()

    if not user or not _verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    return AuthResponse(token=_create_token(user.id), user=_serialize_user(user))


@router.get("/me", response_model=AuthUser)
def me(authorization: str | None = Header(default=None), db: Session = Depends(get_db)) -> AuthUser:
    """Return the currently authenticated user."""
    user = _get_user_from_auth_header(authorization, db)
    return _serialize_user(user)


@router.get("/verify", response_model=VerifyTokenResponse)
def verify_token(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> VerifyTokenResponse:
    """Validate the bearer token and return the linked user."""
    user = _get_user_from_auth_header(authorization, db)
    return VerifyTokenResponse(valid=True, user=_serialize_user(user))

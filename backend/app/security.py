"""Signed anonymous sessions and trusted proxy attribution."""

import hashlib
import hmac
import secrets
import time

from fastapi import Request

SESSION_COOKIE = "pensieve_session"


def signature(value: str, secret: str) -> str:
    return hmac.new(secret.encode(), value.encode(), hashlib.sha256).hexdigest()


def session_identity(cookie: str | None, secret: str) -> tuple[str, str]:
    if cookie:
        parts = cookie.split(".")
        if len(parts) == 3:
            owner, created, signed = parts
            value = f"{owner}.{created}"
            try:
                valid_age = 0 <= time.time() - int(created) < 30 * 86400
            except ValueError:
                valid_age = False
            if (
                valid_age
                and len(owner) == 32
                and hmac.compare_digest(signed, signature(value, secret))
            ):
                return owner, cookie
    owner = secrets.token_hex(16)
    value = f"{owner}.{int(time.time())}"
    return owner, f"{value}.{signature(value, secret)}"


def ip_identity(request: Request, secret: str, trusted_proxy: bool) -> str:
    ip = (
        request.headers.get("x-pensieve-client-ip", "unknown")
        if trusted_proxy
        else request.client.host
        if request.client
        else "unknown"
    )
    return signature(ip, secret)

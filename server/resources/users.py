from flask import request
from flask_restful import Resource
from flask_jwt_extended import jwt_required
from models import User
import os
import requests

RESEND_API_URL = "https://api.resend.com/emails"


def _require_env(name: str) -> str:
    v = os.getenv(name)
    if not v:
        raise RuntimeError(f"Missing env var: {name}")
    return v


class UserList(Resource):
    @jwt_required()
    def get(self):
        users = User.query.all()
        return [
            {
                "id": u.id,
                "first_name": u.first_name,
                "last_name": u.last_name,
                "email": u.email,
            }
            for u in users
        ], 200


class UserContact(Resource):
    """
    POST /users/<user_id>/contact
    Body: { "subject": "...", "message": "..." }

    Sends an email to a single user via Resend (no mailto redirect).
    """

    def post(self, user_id: int):
        user = User.query.get_or_404(user_id)

        data = request.get_json() or {}
        subject = (data.get("subject") or "").strip()
        message = (data.get("message") or "").strip()

        if not subject or not message:
            return {"error": "Subject and message are required"}, 400

        recipient = (user.email or "").strip().lower()
        if not recipient:
            return {"error": "This user has no email"}, 400

        # Resend testing mode fallback (optional)
        # If set, ALL emails will go to this address only (useful until domain verification).
        test_email = os.getenv("RESEND_TEST_EMAIL")
        to_emails = [test_email.strip().lower()] if test_email else [recipient]

        try:
            api_key = _require_env("RESEND_API_KEY")
            from_email = _require_env("RESEND_FROM")
        except Exception as e:
            return {"error": "Email service not configured", "details": str(e)}, 500

        payload = {
            "from": from_email,
            "to": to_emails,
            "subject": subject,
            "text": message,
        }

        r = requests.post(
            RESEND_API_URL,
            json=payload,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            timeout=20,
        )

        if r.status_code >= 400:
            try:
                detail = r.json()
            except Exception:
                detail = {"message": r.text}
            return {"error": "Failed to send email", "details": detail}, 502

        return {"ok": True, "sent_to": len(to_emails)}, 200

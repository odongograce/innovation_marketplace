from flask import request, current_app
from flask_restful import Resource
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request

import os
import uuid
import requests
from werkzeug.utils import secure_filename

from models import db, Project, UserProject, ProjectCategory, User, Category, ProjectLike


def to_int_list(value):
    """Accepts list of ints/strings and returns clean int list."""
    if not isinstance(value, list):
        return []
    out = []
    for v in value:
        try:
            out.append(int(v))
        except Exception:
            continue
    return out


def to_int_list_from_form(values):
    """request.form.getlist('team_members') -> clean int list"""
    if not isinstance(values, list):
        return []
    out = []
    for v in values:
        try:
            out.append(int(v))
        except Exception:
            continue
    return out


ALLOWED_IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp"}


def save_thumbnail(file_storage):
    """
    Saves uploaded file to UPLOAD_FOLDER and returns public url path like '/uploads/<name>'.
    """
    if not file_storage or not file_storage.filename:
        return None

    filename = secure_filename(file_storage.filename)
    _, ext = os.path.splitext(filename.lower())

    if ext not in ALLOWED_IMAGE_EXTS:
        raise ValueError("Thumbnail must be PNG, JPG, or WEBP")

    uploads_dir = current_app.config.get("UPLOAD_FOLDER") or os.path.join(os.getcwd(), "uploads")
    os.makedirs(uploads_dir, exist_ok=True)

    new_name = f"{uuid.uuid4().hex}{ext}"
    save_path = os.path.join(uploads_dir, new_name)
    file_storage.save(save_path)

    return f"/uploads/{new_name}"


class ProjectList(Resource):
    def get(self):
        try:
            verify_jwt_in_request(optional=True)
            user_id = get_jwt_identity()
        except Exception:
            user_id = None

        projects = Project.query.all()
        result = []

        for p in projects:
            team_dict = {}
            for up in p.users:
                uid = up.user.id
                if uid not in team_dict:
                    team_dict[uid] = {
                        "id": up.user.id,
                        "first_name": up.user.first_name,
                        "last_name": up.user.last_name,
                        "email": up.user.email,
                        "role": up.user.role.name,
                        "project_roles": [up.action],
                    }
                else:
                    if up.action not in team_dict[uid]["project_roles"]:
                        team_dict[uid]["project_roles"].append(up.action)

            team = list(team_dict.values())
            categories = [{"id": pc.category.id, "name": pc.category.name} for pc in p.categories if pc.category]

            likes_count = ProjectLike.query.filter_by(project_id=p.id).count()

            liked_by_me = False
            if user_id:
                liked_by_me = ProjectLike.query.filter_by(project_id=p.id, user_id=user_id).first() is not None

            result.append(
                {
                    "id": p.id,
                    "title": p.title,
                    "description": p.description,
                    "video": p.video,
                    "github_url": p.github_url,
                    "technologies": p.technologies,
                    "submitted_name": p.submitted_name,
                    "status": p.status,
                    "created_at": str(p.created_at),
                    "team_members": team,
                    "categories": categories,
                    "likes_count": likes_count,
                    "liked_by_me": liked_by_me,
                    "thumbnail_url": p.thumbnail_url,
                }
            )

        return result, 200

    @jwt_required()
    def post(self):
        user_id = get_jwt_identity()

        content_type = request.content_type or ""
        is_multipart = content_type.startswith("multipart/form-data")

        title = None
        description = None
        video = None
        github_url = None
        technologies = None
        submitted_name = None
        team_members = []
        category_ids = []
        category_name = None
        thumbnail_url = None

        if is_multipart:
            form = request.form

            title = form.get("title")
            description = form.get("description")
            video = form.get("video")
            github_url = form.get("github_url")
            technologies = form.get("technologies")
            submitted_name = form.get("submitted_name")

            team_members = to_int_list_from_form(form.getlist("team_members"))
            category_ids = to_int_list_from_form(form.getlist("category_ids"))
            category_name = form.get("category")

            thumb = request.files.get("thumbnail")
            if thumb:
                try:
                    thumbnail_url = save_thumbnail(thumb)
                except ValueError as e:
                    return {"error": str(e)}, 400
        else:
            data = request.get_json() or {}

            title = data.get("title")
            description = data.get("description")
            video = data.get("video")
            github_url = data.get("github_url")
            technologies = data.get("technologies")
            submitted_name = data.get("submitted_name")

            team_members = to_int_list(data.get("team_members", []))
            category_ids = to_int_list(data.get("category_ids", []))
            category_name = data.get("category")

        if not all([title, description, video, github_url, technologies, submitted_name]):
            return {"error": "Missing required fields"}, 400

        project = Project(
            title=title,
            description=description,
            video=video,
            github_url=github_url,
            technologies=technologies,
            submitted_name=submitted_name,
            thumbnail_url=thumbnail_url,
        )
        db.session.add(project)
        db.session.commit()

        db.session.add(UserProject(user_id=user_id, project_id=project.id, action="creator"))

        for member_id in team_members:
            if member_id == user_id:
                continue
            user = User.query.get(member_id)
            if user:
                db.session.add(UserProject(user_id=user.id, project_id=project.id, action="contributor"))

        for cat_id in category_ids:
            category = Category.query.get(cat_id)
            if category:
                db.session.add(ProjectCategory(project_id=project.id, category_id=category.id))

        if not category_ids and category_name:
            category = Category.query.filter_by(name=category_name).first()
            if category:
                db.session.add(ProjectCategory(project_id=project.id, category_id=category.id))

        db.session.commit()
        return {
            "message": "Project created",
            "project_id": project.id,
            "thumbnail_url": project.thumbnail_url,
        }, 201


class ProjectDetail(Resource):
    @jwt_required()
    def get(self, project_id):
        project = Project.query.get_or_404(project_id)

        team_dict = {}
        for up in project.users:
            uid = up.user.id
            if uid not in team_dict:
                team_dict[uid] = {
                    "id": up.user.id,
                    "first_name": up.user.first_name,
                    "last_name": up.user.last_name,
                    "email": up.user.email,
                    "role": up.user.role.name,
                    "project_roles": [up.action],
                }
            else:
                if up.action not in team_dict[uid]["project_roles"]:
                    team_dict[uid]["project_roles"].append(up.action)

        team = list(team_dict.values())
        categories = [{"id": pc.category.id, "name": pc.category.name} for pc in project.categories if pc.category]

        return {
            "id": project.id,
            "title": project.title,
            "description": project.description,
            "video": project.video,
            "github_url": project.github_url,
            "technologies": project.technologies,
            "submitted_name": project.submitted_name,
            "status": project.status,
            "created_at": str(project.created_at),
            "team_members": team,
            "categories": categories,
            "thumbnail_url": project.thumbnail_url,
        }, 200

    @jwt_required()
    def patch(self, project_id):
        user_id = get_jwt_identity()
        project = Project.query.get_or_404(project_id)
        data = request.get_json() or {}

        creator = next((up.user_id for up in project.users if up.action == "creator"), None)
        current_user_role = User.query.get(user_id).role.name

        if user_id != creator and current_user_role != "admin":
            return {"error": "Unauthorized"}, 403

        if "title" in data:
            project.title = data["title"]
        if "description" in data:
            project.description = data["description"]
        if "video" in data:
            project.video = data["video"]
        if "github_url" in data:
            project.github_url = data["github_url"]
        if "technologies" in data:
            project.technologies = data["technologies"]

        db.session.commit()
        return {"message": "Project updated"}, 200


def _unique_team_emails(project: Project):
    emails = []
    seen = set()
    for up in project.users:
        if not up.user:
            continue
        e = (up.user.email or "").strip().lower()
        if e and e not in seen:
            seen.add(e)
            emails.append(e)
    return emails


class ProjectContactTeam(Resource):
    """
    POST /projects/<project_id>/contact

    Body:
      { "subject": "...", "message": "..." }

    Sends email to ALL project team members (creator + contributors) using Resend.
    """

    def post(self, project_id):
        try:
            verify_jwt_in_request(optional=True)
            sender_user_id = get_jwt_identity()
        except Exception:
            sender_user_id = None

        data = request.get_json(silent=True) or {}
        subject = (data.get("subject") or "").strip()
        message = (data.get("message") or "").strip()

        if not subject:
            return {"error": "Subject is required"}, 400
        if not message:
            return {"error": "Message is required"}, 400
        if len(message) > 5000:
            return {"error": "Message too long (max 5000 chars)"}, 400

        project = Project.query.get(project_id)
        if not project:
            return {"error": "Project not found"}, 404

        to_emails = _unique_team_emails(project)
        if not to_emails:
            return {"error": "No team emails available for this project"}, 400

        resend_key = os.getenv("RESEND_API_KEY")
        resend_from = os.getenv("RESEND_FROM")

        if not resend_key or not resend_from:
            return {"error": "Email service not configured (RESEND_API_KEY / RESEND_FROM missing)"}, 500

        sender_line = ""
        if sender_user_id:
            sender = User.query.get(sender_user_id)
            if sender:
                sender_line = f"\n\n---\nFrom: {sender.first_name} {sender.last_name} <{sender.email}>\n"

        email_text = (
            f"Project: {project.title}\n"
            f"Submitted by: {project.submitted_name}\n\n"
            f"{message}"
            f"{sender_line}"
        )

        testing_email = os.getenv("RESEND_TEST_EMAIL")
        if testing_email:
            to_emails = [testing_email.strip().lower()]


        payload = {
            "from": resend_from,
            "to": to_emails,
            "subject": subject,
            "text": email_text,
        }

        try:
            r = requests.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {resend_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=20,
            )

            if r.status_code >= 400:
                try:
                    detail = r.json()
                except Exception:
                    detail = {"message": r.text}
                return {"error": "Failed to send email", "details": detail}, 502

            return {"ok": True, "sent_to": len(to_emails)}, 200

        except requests.RequestException as e:
            return {"error": "Failed to send email", "details": str(e)}, 502

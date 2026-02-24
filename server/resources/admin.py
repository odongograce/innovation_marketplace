from flask import request
from flask_restful import Resource
from flask_jwt_extended import jwt_required, get_jwt_identity

from models import db, User, Project, Category


def require_admin():
    """
    Ensures the JWT identity matches a real user and that the user is an admin.
    Returns: (user, None) on success
             (None, (payload, status_code)) on failure
    """
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)

    if not user:
        return None, ({"error": "Invalid token user. Please log in again."}, 401)

    if not user.role or user.role.name != "admin":
        return None, ({"error": "Admin access required"}, 403)

    return user, None

class CategoryCreate(Resource):
    @jwt_required()
    def post(self):
        user, err = require_admin()
        if err:
            return err

        data = request.get_json(silent=True) or {}
        name = data.get("name", "").strip()

        if not name:
            return {"error": "Missing category name"}, 400

        if Category.query.filter_by(name=name).first():
            return {"error": "Category already exists"}, 400

        category = Category(
            name=name,
            description=(data.get("description") or "").strip()
        )
        db.session.add(category)
        db.session.commit()
        return {"message": f"Category '{category.name}' created"}, 201

class ApproveProject(Resource):
    @jwt_required()
    def post(self, project_id):
        user, err = require_admin()
        if err:
            return err

        project = Project.query.get(project_id)
        if not project:
            return {"error": "Project not found"}, 404

        data = request.get_json(silent=True) or {}
        reason = (data.get("reason") or "").strip()

        project.status = "approved"
        project.approval_reason = reason
        db.session.commit()

        return {"message": f"Project '{project.title}' approved", "reason": reason}, 200


class RejectProject(Resource):
    @jwt_required()
    def post(self, project_id):
        user, err = require_admin()
        if err:
            return err

        project = Project.query.get(project_id)
        if not project:
            return {"error": "Project not found"}, 404

        data = request.get_json(silent=True) or {}
        reason = (data.get("reason") or "").strip()

        project.status = "rejected"
        project.rejection_reason = reason
        db.session.commit()

        return {"message": f"Project '{project.title}' rejected", "reason": reason}, 200


class AdminUserList(Resource):
    @jwt_required()
    def get(self):
        user, err = require_admin()
        if err:
            return err

        users = User.query.all()

        return [
            {
                "id": u.id,
                "first_name": u.first_name,
                "last_name": u.last_name,
                "email": u.email,
                "role": u.role.name if u.role else None,
                "status": u.status,
                "created_at": u.created_at.isoformat()
            }
            for u in users
        ], 200

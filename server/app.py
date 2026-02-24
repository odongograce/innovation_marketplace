from dotenv import load_dotenv
load_dotenv()

from flask import Flask, send_from_directory
from flask_migrate import Migrate
from flask_restful import Api
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from models import db
import os

from resources.mpesa import MpesaPay, MpesaCallback
from resources.auth import Signup, Login, UpdateProfile
from resources.projects import ProjectList, ProjectDetail, ProjectContactTeam
from resources.merchandise import MerchandiseList, MerchandiseItem
from resources.orders import OrderCreate, OrderDelete
from resources.admin import CategoryCreate, ApproveProject, RejectProject, AdminUserList
from resources.recruiters import BrowseProjects
from resources.likes import ProjectLikeToggle
from resources.users import UserList, UserContact


def _get_database_url() -> str:
    """
    Render provides DATABASE_URL often starting with postgres://
    SQLAlchemy expects postgresql://
    """
    url = os.getenv("DATABASE_URL", "").strip()
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url


def create_app():
    app = Flask(__name__)

    # DB: use cloud DATABASE_URL, fallback to local dev DB
    app.config["SQLALCHEMY_DATABASE_URI"] = (
        _get_database_url()
        or "postgresql+psycopg2://biboko:12345678@localhost:5432/moringa_innovation_marketplace_db"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    # JWT
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "dev-secret-key")

    # uploads
    app.config["UPLOAD_FOLDER"] = os.path.join(os.getcwd(), "uploads")

    db.init_app(app)
    Migrate(app, db)
    JWTManager(app)

    # CORS: lock to frontend in production
    # Set FRONTEND_URL on Render to Vercel domain e.g. https://innovation-marketplace.vercel.app
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    CORS(
        app,
        supports_credentials=True,
        resources={r"/*": {"origins": [
            "https://frontend-teal-seven-91.vercel.app"
        ]}}
    )


    api = Api(app)

    api.add_resource(Signup, "/signup")
    api.add_resource(Login, "/login")
    api.add_resource(UpdateProfile, "/profile")

    api.add_resource(ProjectList, "/projects")
    api.add_resource(ProjectDetail, "/projects/<int:project_id>")
    api.add_resource(ProjectContactTeam, "/projects/<int:project_id>/contact")

    api.add_resource(ProjectLikeToggle, "/projects/<int:project_id>/like")

    api.add_resource(MerchandiseList, "/merchandise")
    api.add_resource(MerchandiseItem, "/merchandise/<int:id>")

    api.add_resource(OrderCreate, "/orders")
    api.add_resource(OrderDelete, "/orders/<int:order_id>")

    api.add_resource(CategoryCreate, "/admin/categories")
    api.add_resource(ApproveProject, "/admin/projects/<int:project_id>/approve")
    api.add_resource(RejectProject, "/admin/projects/<int:project_id>/reject")
    api.add_resource(AdminUserList, "/admin/users")

    api.add_resource(UserList, "/users")
    api.add_resource(UserContact, "/users/<int:user_id>/contact")

    api.add_resource(BrowseProjects, "/recruiters/projects")

    api.add_resource(MpesaPay, "/mpesa/pay")
    api.add_resource(MpesaCallback, "/mpesa/callback")

    @app.route("/uploads/<path:filename>")
    def uploads(filename):
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

    @app.route("/")
    def home():
        return {"status": "API running"}, 200

    return app


app = create_app()

if __name__ == "__main__":
    app.run(port=5555, debug=True)

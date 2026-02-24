from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import MetaData
from datetime import datetime
from sqlalchemy import UniqueConstraint

metadata = MetaData()
db = SQLAlchemy(metadata=metadata)


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    email = db.Column(db.String(255), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role_id = db.Column(db.Integer, db.ForeignKey("user_roles.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(50), default="active", nullable=False)

    role = db.relationship("UserRole", back_populates="users")
    projects = db.relationship("UserProject", back_populates="user")
    orders = db.relationship("Order", back_populates="user")


class UserRole(db.Model):
    __tablename__ = 'user_roles'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    description = db.Column(db.String(100), nullable=False)

    users = db.relationship("User", back_populates="role")


class Project(db.Model):
    __tablename__ = "projects"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(50), nullable=False)
    description = db.Column(db.String(500), nullable=False)
    video = db.Column(db.String(255), nullable=False)
    github_url = db.Column(db.String(255), nullable=False)
    technologies = db.Column(db.String(255), nullable=False)
    submitted_name = db.Column(db.String(100), nullable=False)

    thumbnail_url = db.Column(db.String(255), nullable=True)

    status = db.Column(db.String(50), default="pending")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    approval_reason = db.Column(db.String(500), nullable=True)
    rejection_reason = db.Column(db.String(500), nullable=True)

    # One project can have many users
    users = db.relationship("UserProject", back_populates="project")
    # One project can belong to many categories
    categories = db.relationship("ProjectCategory", back_populates="project")


class UserProject(db.Model):
    __tablename__ = "user_projects"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=False)
    action = db.Column(db.String(50), nullable=False)

    user = db.relationship("User", back_populates="projects")
    project = db.relationship("Project", back_populates="users")


class Category(db.Model):
    __tablename__ = "categories"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.String(255), nullable=False)

    projects = db.relationship("ProjectCategory", back_populates="category")


class ProjectCategory(db.Model):
    __tablename__ = "project_categories"

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"), nullable=False)

    project = db.relationship("Project", back_populates="categories")
    category = db.relationship("Category", back_populates="projects")


class Merchandise(db.Model):
    __tablename__ = "merchandise"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.String(255), nullable=False)
    price = db.Column(db.Numeric(10, 2), nullable=False)
    stock = db.Column(db.Integer, nullable=False)
    image_url = db.Column(db.String(255), nullable=False)

    orders = db.relationship("OrderMerchandise", back_populates="merchandise")


class Order(db.Model):
    __tablename__ = "orders"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    total_amount = db.Column(db.Numeric(10, 2), nullable=False)
    status = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    payment_method = db.Column(db.String(20))
    checkout_request_id = db.Column(db.String(100))
    mpesa_receipt = db.Column(db.String(50))

    user = db.relationship("User", back_populates="orders")
    items = db.relationship("OrderMerchandise", back_populates="order")


class OrderMerchandise(db.Model):
    __tablename__ = "order_merchandise"

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id"), nullable=False)
    merchandise_id = db.Column(db.Integer, db.ForeignKey("merchandise.id"), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    price_at_purchase = db.Column(db.Numeric(10, 2), nullable=False)

    order = db.relationship("Order", back_populates="items")
    merchandise = db.relationship("Merchandise", back_populates="orders")


class ProjectLike(db.Model):
    __tablename__ = "project_likes"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User")
    project = db.relationship("Project")

    __table_args__ = (
        UniqueConstraint("user_id", "project_id", name="uq_user_project_like"),
    )

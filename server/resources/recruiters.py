from flask_restful import Resource
from models import Project


class BrowseProjects(Resource):
    def get(self):
        projects = Project.query.filter_by(status="approved").all()
        result = []

        for p in projects:
            team_members = [
                {"id": link.user.id, "name": f"{link.user.first_name} {link.user.last_name}"}
                for link in p.users
            ]

            result.append({
                "id": p.id,
                "title": p.title,
                "description": p.description,
                "technologies": p.technologies,
                "submitted_name": p.submitted_name,
                "team_members": team_members,
                "thumbnail_url": p.thumbnail_url,
            })

        return result, 200

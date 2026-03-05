from .extensions import db


#export DATABASE_URL="postgresql://walter:WalexNet@server:5432/portfolio"


class Project(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150))
    description = db.Column(db.Text)
    tech_stack = db.Column(db.String(250))
    github_url = db.Column(db.String(250))

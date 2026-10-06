# Rutas (controlador)

from flask import (
    Blueprint,
    render_template,
    request,
    flash,
    redirect,
    url_for,
    current_app,
)
from sqlalchemy import select

from app.extensions import db
from app.models import Certification

import smtplib
from email.message import EmailMessage


main = Blueprint(
    'main',
    __name__,
    url_prefix="/",
    template_folder="../templates"
)


@main.route('/')
def index():

    stmt = (
        select(Certification)
        .where(
            Certification.is_published.is_(True)
        )
        .order_by(
            Certification.display_order,
            Certification.issue_date.desc(),
            Certification.title
        )
    )

    certifications = db.session.scalars(stmt).all()

    return render_template(
        'index.html',
        certifications=certifications
    )


@main.post('/send_mail')
def send_mail():

    # Credenciales obtenidas desde variables de entorno
    email_emisor = current_app.config["MAIL_USERNAME"]
    password = current_app.config["MAIL_PASSWORD"]
    email_receptor = current_app.config["MAIL_RECIPIENT"]

    # Datos del formulario
    nombre = request.form.get("name")
    correo = request.form.get("email")
    subject = request.form.get("subject")

    mensaje = f"Nombre: {nombre}\nCorreo: {correo}\n\n"
    mensaje += request.form.get("message")

    # Crear mensaje
    msg = EmailMessage()
    msg["Subject"] = "WalexNET web - " + subject
    msg["From"] = email_emisor
    msg["To"] = email_receptor
    msg.set_content(mensaje)

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
            smtp.login(email_emisor, password)
            smtp.send_message(msg)

        flash(
            "Correo enviado correctamente al Administrador",
            "success"
        )

    except Exception as e:
        flash(
            f"Error al enviar el correo: {e}",
            "warning"
        )

    return redirect(
        url_for(
            "main.index",
            _anchor="contact"
        )
    )
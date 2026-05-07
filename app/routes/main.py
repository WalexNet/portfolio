# Rutas (controlador)

from flask import Blueprint, render_template, request, flash, redirect, url_for
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
    return render_template('index.html')

# Contraseña app WalexNET: dbyl ygvg krgc awax de dwp.trabajos@gmail.com
@main.post('send_mail')
def send_mail():
    # 1. Configuración de credenciales y servidor
    email_emisor = "str1132@gmail.com"
    password = "dbylygvgkrgcawax"  # No es tu clave normal, ver nota abajo
    email_receptor = "walter@walex.net"
    # 1.5 Leemos los datos del formulario
    nombre = request.form.get("name")
    correo = request.form.get("email")
    subject = request.form.get("subject")
    mensaje = f"Nombre: {nombre}\nCorreo: {correo}\n\n"
    mensaje += request.form.get("message")
    # 2. Crear la estructura del mensaje
    msg = EmailMessage()
    msg['Subject'] = 'WalexNET web - '+subject
    msg['From'] = email_emisor
    msg['To'] = email_receptor
    msg.set_content(mensaje)

    # 3. Envío seguro a través de SSL
    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(email_emisor, password)
            smtp.send_message(msg)
        flash("Correo enviado correctamente al Administrador", "success")
        # IMPORTANTE: Flask necesita un return
        return redirect(url_for('main.index', _anchor='contact'))
    except Exception as e:
        flash(f"Error al enviar el correo: {e}", "warning")
        # También debes retornar algo en caso de error
        return redirect(url_for('main.index', _anchor='contact'))
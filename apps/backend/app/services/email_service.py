import smtplib
from email.message import EmailMessage
from email.utils import formatdate
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.server = settings.SMTP_SERVER
        self.port = settings.SMTP_PORT
        self.user = settings.SMTP_USER
        self.password = settings.SMTP_PASSWORD
        self.use_tls = settings.SMTP_USE_TLS

    def send_html_email(self, to_email: str, subject: str, html_content: str) -> bool:
        if not self.server or not self.user or not self.password:
            logger.error("SMTP settings are missing. Cannot send email.")
            return False

        msg = EmailMessage()
        msg['Subject'] = subject
        msg['From'] = self.user
        msg['To'] = to_email
        msg['Date'] = formatdate(localtime=True)
        msg.set_content("Пожалуйста, используйте почтовый клиент, поддерживающий HTML.", subtype="plain")
        msg.add_alternative(html_content, subtype="html")

        try:
            with smtplib.SMTP(self.server, self.port) as smtp:
                if self.use_tls:
                    smtp.starttls()
                smtp.login(self.user, self.password)
                smtp.send_message(msg)
            logger.info(f"Report email successfully sent to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False

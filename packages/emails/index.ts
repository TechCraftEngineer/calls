import InvitationEmail from "./emails/invitation";
import OtpSignInEmail from "./emails/otp-sign-in";
import ReportEmail, { type ReportType, type ReportEmailProps, type ManagerStats } from "./emails/report";
import ResetPasswordEmail from "./emails/reset-password";
import WelcomeEmail from "./emails/welcome";

export { sendEmail, sendEmailHtml } from "./send";
export {
  InvitationEmail,
  OtpSignInEmail,
  ReportEmail,
  ResetPasswordEmail,
  WelcomeEmail,
};
export type { ReportType, ReportEmailProps, ManagerStats };

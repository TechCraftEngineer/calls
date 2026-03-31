import InvitationEmail from "./emails/invitation";
import OtpSignInEmail from "./emails/otp-sign-in";
import ReportEmail, {
  type ManagerStats,
  type ReportEmailProps,
  type ReportType,
} from "./emails/report";
import ResetPasswordEmail from "./emails/reset-password";
import WelcomeEmail from "./emails/welcome";

export { sendEmail, sendEmailHtml } from "./send";
export type { ManagerStats, ReportEmailProps, ReportType };
export { InvitationEmail, OtpSignInEmail, ReportEmail, ResetPasswordEmail, WelcomeEmail };

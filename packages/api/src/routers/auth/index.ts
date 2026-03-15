import { checkEmail } from "./check-email";
import { login } from "./login";
import { logout } from "./logout";
import { me } from "./me";

export const authRouter = {
  login,
  logout,
  checkEmail,
  me,
};

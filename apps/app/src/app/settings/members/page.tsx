import { paths } from "@calls/config";
import { redirect } from "next/navigation";

export default function SettingsMembersRedirect() {
  redirect(paths.users.root);
}

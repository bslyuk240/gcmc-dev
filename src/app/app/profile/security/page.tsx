import { redirect } from "next/navigation";

/** Redirect old Security URL to Settings. */
export default function ProfileSecurityRedirect() {
  redirect("/app/profile/settings");
}

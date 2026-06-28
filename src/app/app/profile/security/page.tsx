import { redirect } from "next/navigation";

export default function ProfileSecurityRedirect() {
  redirect("/staff/profile");
}

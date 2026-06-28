import { redirect } from "next/navigation";

export default function ProfilePermissionsRedirect() {
  redirect("/staff/profile");
}

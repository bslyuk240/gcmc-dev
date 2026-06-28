import { redirect } from "next/navigation";

export default function ProfileOverviewRedirect() {
  redirect("/staff/dashboard");
}

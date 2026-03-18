import { redirect } from "next/navigation";

export default function ProfileSubpageRedirect() {
  redirect("/staff/dashboard");
}

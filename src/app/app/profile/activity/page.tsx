import { redirect } from "next/navigation";

export default function ProfileActivityRedirect() {
  redirect("/staff/notifications");
}

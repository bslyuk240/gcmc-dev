import { redirect } from "next/navigation";

export default function ProfileAttendanceRedirect() {
  redirect("/staff/attendance");
}

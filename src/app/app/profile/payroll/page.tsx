import { redirect } from "next/navigation";

export default function ProfilePayrollRedirect() {
  redirect("/staff/payslips");
}

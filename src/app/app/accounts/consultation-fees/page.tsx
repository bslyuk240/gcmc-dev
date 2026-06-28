import { redirect } from "next/navigation";

export default function LegacyConsultationFeesPage() {
  redirect("/app/accounts/cash-desk?department=doctors");
}

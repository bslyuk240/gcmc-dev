import { redirect } from "next/navigation";

export default function LegacyDailyReportsPage() {
  redirect("/app/accounts/reports");
}

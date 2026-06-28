import { redirect } from "next/navigation";

export default function LegacyPaymentsHistoryPage() {
  redirect("/app/accounts/ledger");
}

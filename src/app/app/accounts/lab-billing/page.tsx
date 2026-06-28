import { redirect } from "next/navigation";

export default function LegacyLabBillingPage() {
  redirect("/app/accounts/cash-desk?department=lab");
}

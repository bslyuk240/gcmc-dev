import { redirect } from "next/navigation";

export default function LegacyNursingBillingPage() {
  redirect("/app/accounts/cash-desk?department=nurses");
}

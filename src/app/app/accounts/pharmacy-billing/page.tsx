import { redirect } from "next/navigation";

export default function LegacyPharmacyBillingPage() {
  redirect("/app/accounts/cash-desk?department=pharmacy");
}

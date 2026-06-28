import { redirect } from "next/navigation";

export default function LegacyAccountsCatchAllPage() {
  redirect("/app/accounts");
}

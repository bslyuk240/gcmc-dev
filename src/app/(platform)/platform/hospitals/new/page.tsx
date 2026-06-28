import { redirect } from "next/navigation";

/** Manual hospital creation is replaced by signup → Approvals flow. */
export default function NewHospitalPage() {
  redirect("/platform/approvals");
}

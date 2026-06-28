import { redirect } from "next/navigation";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";

export default function NonClinicalRootPage() {
  redirect(`${INTERNAL_PREFIX}/non_clinical/dashboard`);
}

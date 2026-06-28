import { redirect } from "next/navigation";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";

export default function ITSystemLogsPage() {
  redirect(`${INTERNAL_PREFIX}/it/audit-logs`);
}

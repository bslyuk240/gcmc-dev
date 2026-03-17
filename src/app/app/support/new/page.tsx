import { redirect } from "next/navigation";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";

/** Legacy new-ticket URL → IT & Management chat. */
export default function SupportNewRedirectPage() {
  redirect(`${INTERNAL_PREFIX}/chat`);
}

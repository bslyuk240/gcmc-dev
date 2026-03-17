import { redirect } from "next/navigation";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";

/** Legacy support URL → IT & Management chat. */
export default function SupportRedirectPage() {
  redirect(`${INTERNAL_PREFIX}/chat`);
}

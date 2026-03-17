import { redirect } from "next/navigation";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";

/** Legacy route — staff HR chat now lives at /app/profile/chat. */
export default function StaffHRChatLegacyRedirect() {
  redirect(`${INTERNAL_PREFIX}/profile/chat`);
}

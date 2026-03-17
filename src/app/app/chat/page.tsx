import { redirect } from "next/navigation";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";

/** Legacy /app/chat route — redirect to admin-owned chat. */
export default function ChatLegacyRedirect() {
  redirect(`${INTERNAL_PREFIX}/admin/chat`);
}

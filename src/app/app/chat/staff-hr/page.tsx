import { redirect } from "next/navigation";

/** Legacy route — staff HR chat now lives at /staff/chat. */
export default function StaffHRChatLegacyRedirect() {
  redirect("/staff/chat");
}

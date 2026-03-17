import { redirect } from "next/navigation";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";

export default function NotificationsRedirectPage() {
  redirect(`${INTERNAL_PREFIX}/profile/notifications`);
}

import { redirect } from "next/navigation";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";

/** Legacy new support ticket URL → Staff & HR chat. */
export default function ProfileSupportNewRedirectPage() {
  redirect(`${INTERNAL_PREFIX}/chat?channel=staff-hr`);
}

import { redirect } from "next/navigation";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";

/** Legacy profile support URL → Staff & HR chat. */
export default function ProfileSupportRedirectPage() {
  redirect(`${INTERNAL_PREFIX}/chat?channel=staff-hr`);
}

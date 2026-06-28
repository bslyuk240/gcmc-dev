import { redirect } from "next/navigation";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";

export default function StoreRequestsRedirectPage() {
  redirect(`${INTERNAL_PREFIX}/store/requisitions`);
}

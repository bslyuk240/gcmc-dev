import { redirect } from "next/navigation";

export default function PlatformIndexRedirect() {
  redirect("/platform/dashboard");
}

import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { HospitalSignupForm } from "./hospital-signup-form";

export const metadata = { title: "Register your hospital - HMS" };

export default function HospitalSignupPage() {
  return (
    <AuthShell
      brandName="Hospital Management System"
      eyebrow="Tenant onboarding"
      title="Register your hospital"
      subtitle="Submit your registration request. Our team will review it and provision your account within 1-2 business days."
      cardClassName="max-w-[720px]"
      footer={
        <p className="text-center text-sm font-medium text-slate-500">
          Already registered?{" "}
          <Link href="/login" className="font-bold text-blue-700 hover:text-blue-800">
            Sign in
          </Link>
        </p>
      }
    >
      <HospitalSignupForm />
    </AuthShell>
  );
}

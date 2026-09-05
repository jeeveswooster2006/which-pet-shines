import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoginForm } from "@/components/AdminLoginForm";

export const metadata: Metadata = { title: "Admin login", robots: { index: false, follow: false } };

export default function AdminLoginPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-center font-display text-2xl font-extrabold text-ink">Admin sign in</h1>
      <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-soft">
        <Suspense>
          <AdminLoginForm />
        </Suspense>
      </div>
    </div>
  );
}

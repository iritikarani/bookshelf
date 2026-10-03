import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginPage } from "@/components/LoginPage";

export const metadata: Metadata = {
  title: "Sign in · Cosmic Space",
  description: "A reading journal and a bookshelf that feels like home.",
};

export default function Page() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  );
}

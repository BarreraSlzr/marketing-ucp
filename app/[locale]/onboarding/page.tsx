import { OnboardingClient } from "@/components/onboarding";
import type { Metadata } from "next";
import { NuqsAdapter } from "nuqs/adapters/next/app";

export const metadata: Metadata = {
  title: "Adapter Onboarding | UCP",
  description:
    "Configure and onboard new payment adapters, storefronts, and services for the UCP platform.",
};

export default function OnboardingPage() {
  return (
    <NuqsAdapter>
      <OnboardingClient />
    </NuqsAdapter>
  );
}

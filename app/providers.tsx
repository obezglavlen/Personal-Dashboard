"use client";

import { SessionProvider } from "next-auth/react";
import { ServiceWorkerRegister } from "@/components/shared/sw-register";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster />
      <ServiceWorkerRegister />
    </SessionProvider>
  );
}

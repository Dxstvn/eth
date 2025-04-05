"use client";

import type React from "react";
import Script from "next/script";
import { AuthProvider } from "@/context/auth-context";
import AppShell from "@/components/app-shell";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js"
          strategy="afterInteractive"
        />
        <Script
          src="https://www.gstatic.com/firebasejs/10.14.0/firebase-auth-compat.js"
          strategy="afterInteractive"
          onLoad={() => {
            console.log("Firebase auth script loaded");
            window.firebaseLoaded = true; // Set a global flag
          }}
        />
      </head>
      <body>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}


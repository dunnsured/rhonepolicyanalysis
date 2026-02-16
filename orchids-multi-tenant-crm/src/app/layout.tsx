import type { Metadata } from "next";
import "./globals.css";
import { VisualEditsMessenger } from "orchids-visual-edits";
import { Toaster } from "sonner";
import Script from "next/script";

export const metadata: Metadata = {
  title: "TenantCRM - Multi-Tenant CRM Platform",
  description: "Sales pipeline, customer service, and partner management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Script
          id="orchids-browser-logs"
          src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/scripts/orchids-browser-logs.js"
          strategy="afterInteractive"
          data-orchids-project-id="dcebcc44-5064-4c16-82ca-39643446d75a"
        />
        {children}
        <Toaster position="top-right" richColors />
        <VisualEditsMessenger />
      </body>
    </html>
  );
}

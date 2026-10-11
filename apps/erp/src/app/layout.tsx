import type { Metadata } from "next";
import { I18nProvider } from "@/lib/i18n/provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Campus ERP",
  description: "Staff, student, and campus operations desk",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}

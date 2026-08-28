import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Public Meeting Digest",
  description:
    "Turn published municipal meeting minutes into a short, item-by-item digest with a source-checked audit table. A reading aid, not the official record.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}

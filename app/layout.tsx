import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KamilFit — AI-assisted coaching",
  description: "Plan, coach and adapt training programs with AI assistance.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProFit — Train like it's your job",
  description: "Plan, coach and adapt training programs with AI assistance.",
  icons: { icon: "/logo-mark.png" },
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

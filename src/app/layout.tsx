import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TuneTribe - Discover Listening Events",
  description: "Find and create listening events in your city",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "broneering.info",
  description: "Lihtne ja rahulik viis oma aeg broneerida.",
  icons: { icon: "/icon.svg" },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="et">
      <body>{children}</body>
    </html>
  );
}

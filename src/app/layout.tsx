import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "broneering.info",
  description: "Lihtne ja rahulik viis oma aeg broneerida.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="et">
      <body>{children}</body>
    </html>
  );
}

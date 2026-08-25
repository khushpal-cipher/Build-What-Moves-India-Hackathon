import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PassportPath | Demo",
  description: "A mobile-first Passport Seva prototype for the Build What Moves India hackathon."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

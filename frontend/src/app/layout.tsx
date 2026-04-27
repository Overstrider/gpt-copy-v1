import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "gpt-copy-v1",
  description: "ChatGPT-style CodeDungeon example",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

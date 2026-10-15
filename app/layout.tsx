import type { Metadata } from "next";
import { Special_Elite } from "next/font/google";
import "./globals.css";

const typewriter = Special_Elite({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-typewriter",
});

export const metadata: Metadata = {
  title: "title",
  description: "An interactive map of our friends, drawn from a Google Form.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${typewriter.variable} h-full`}>
      <body className={`${typewriter.className} min-h-full`}>{children}</body>
    </html>
  );
}

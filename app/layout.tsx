import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BloomQuest Family",
  description: "A private reward space for our family.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}

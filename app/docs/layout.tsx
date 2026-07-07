import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation — EOS Platform",
  description: "User guide for the EOS Business Operating System",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

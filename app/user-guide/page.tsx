import fs from "fs";
import path from "path";
import { renderMarkdown } from "@/lib/markdown";
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';

export const dynamic = "force-dynamic";

export const metadata = {
  title: "User Guide — TRAC BSIT CSMS",
  description: "Complete user guide for the Class Schedule Management System.",
};

export default function UserGuidePage() {
  const raw = fs.readFileSync(
    path.join(process.cwd(), "docs", "USER_GUIDE.md"),
    "utf-8"
  );
  const lines = raw.split("\n");
  const md = lines.slice(3).join("\n");
  const html = renderMarkdown(md);
  return (
    <div className="min-h-screen">
      <PublicHeader />
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-6">
        </div>
        <h1 className="mb-2 text-4xl font-bold text-ink">
          Class Schedule Management System
        </h1>
        <p className="mb-10 text-lg text-muted">
          Complete User Guide — based on the verified frontend implementation
        </p>
        <article className="user-guide" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
      <PublicFooter />
    </div>
  );
}

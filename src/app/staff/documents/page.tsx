"use client";

import Link from "next/link";
import { useState } from "react";
import { useStaffPortalStore } from "@/lib/hooks/use-staff-portal-store";
import { fetchStaffDocumentDownloadUrl } from "@/lib/staff-portal/client";

const CAT_STYLES: Record<string, string> = {
  Contract: "bg-indigo-50 text-indigo-700",
  Certificate: "bg-emerald-50 text-emerald-700",
  Letter: "bg-sky-50 text-sky-700",
  Policy: "bg-slate-100 text-slate-600",
  Training: "bg-violet-50 text-violet-700",
  Other: "bg-slate-100 text-slate-600",
};

const STATUS_STYLES: Record<string, string> = {
  Valid: "text-emerald-600",
  "Expiring Soon": "text-amber-600 font-semibold",
  Expired: "text-red-600 font-semibold",
};

export default function DocumentsPage() {
  const { documents, hydrated } = useStaffPortalStore();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const expiring = documents.filter((d) => d.status === "Expiring Soon" || d.status === "Expired");

  async function handleDownload(documentId: string) {
    setDownloadingId(documentId);
    try {
      const url = await fetchStaffDocumentDownloadUrl(documentId);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      // silent — user sees no new tab
    } finally {
      setDownloadingId(null);
    }
  }

  if (!hydrated) {
    return <p className="py-12 text-center text-sm text-slate-400">Loading documents…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Documents</h1>
        <p className="mt-1 text-sm text-slate-500">HR documents, certificates, and contracts shared with you.</p>
      </div>

      {expiring.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-bold text-amber-800">
            {expiring.length} document{expiring.length > 1 ? "s" : ""} expiring or expired — contact HR to renew.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {documents.length === 0 ? (
          <div className="mt-2 space-y-3">
            <div className="rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
              No documents have been published to your account yet.
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Link href="/staff/profile" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:border-indigo-200 hover:bg-indigo-50">
                View profile
              </Link>
              <Link href="/staff/payslips" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:border-indigo-200 hover:bg-indigo-50">
                View payslips
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-start justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">{doc.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${CAT_STYLES[doc.category] ?? CAT_STYLES.Other}`}>
                      {doc.category}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {doc.issuedOn ? `Issued ${doc.issuedOn}` : "Issued date not set"}
                    {doc.expiryDate ? ` · Expires ${doc.expiryDate}` : ""}
                    {doc.fileName ? ` · ${doc.fileName}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {doc.storagePath ? (
                    <button
                      type="button"
                      onClick={() => void handleDownload(doc.id)}
                      disabled={downloadingId === doc.id}
                      className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                    >
                      {downloadingId === doc.id ? "…" : "Download"}
                    </button>
                  ) : null}
                  <span className={`text-xs ${STATUS_STYLES[doc.status] ?? ""}`}>{doc.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

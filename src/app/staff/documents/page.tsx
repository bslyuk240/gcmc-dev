"use client";

import { useHMSSession } from "@/modules/rbac/hooks";

type DocCategory = "Contract" | "Certificate" | "Letter" | "Policy" | "Training";

type HRDocument = {
  id: string;
  title: string;
  category: DocCategory;
  issuedOn: string;
  expiryDate?: string;
  status: "Valid" | "Expiring Soon" | "Expired";
};

const MOCK_DOCS: HRDocument[] = [];

const CAT_STYLES: Record<DocCategory, string> = {
  Contract:    "bg-indigo-50 text-indigo-700",
  Certificate: "bg-emerald-50 text-emerald-700",
  Letter:      "bg-sky-50 text-sky-700",
  Policy:      "bg-slate-100 text-slate-600",
  Training:    "bg-violet-50 text-violet-700",
};

const STATUS_STYLES: Record<HRDocument["status"], string> = {
  "Valid":          "text-emerald-600",
  "Expiring Soon":  "text-amber-600 font-semibold",
  "Expired":        "text-red-600 font-semibold",
};

const CATEGORIES: DocCategory[] = ["Contract", "Certificate", "Letter", "Policy", "Training"];

export default function DocumentsPage() {
  const session     = useHMSSession();
  const expiring    = MOCK_DOCS.filter((d) => d.status === "Expiring Soon" || d.status === "Expired");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Documents</h1>
        <p className="mt-1 text-sm text-slate-500">HR documents, certificates, and contracts.</p>
      </div>

      {/* Expiry alerts */}
      {expiring.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-bold text-amber-800">
            {expiring.length} document{expiring.length > 1 ? "s" : ""} expiring or expired — contact HR to renew.
          </p>
          {expiring.map((d) => (
            <p key={d.id} className="mt-1 text-xs text-amber-700">
              · {d.title}{d.expiryDate && ` — expires ${new Date(d.expiryDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
            </p>
          ))}
        </div>
      )}

      {/* Category groups */}
      {CATEGORIES.map((cat) => {
        const docs = MOCK_DOCS.filter((d) => d.category === cat);
        if (docs.length === 0) return null;
        return (
          <div key={cat}>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">{cat}s</p>
            <div className="space-y-2">
              {docs.map((doc) => (
                <div key={doc.id} className="flex items-start justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">{doc.title}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${CAT_STYLES[doc.category]}`}>{doc.category}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Issued {new Date(doc.issuedOn).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      {doc.expiryDate && ` · Expires ${new Date(doc.expiryDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs ${STATUS_STYLES[doc.status]}`}>{doc.status}</span>
                    <button className="text-[10px] font-bold text-indigo-500 hover:underline">View</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <p className="text-center text-xs text-slate-300">
        Contact HR to upload or update your documents.
      </p>
    </div>
  );
}

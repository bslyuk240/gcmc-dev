"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";

export default function ItSystemPage() {
  return (
    <div className="w-full max-w-none space-y-6 sm:space-y-8">
      <PageHeader
        title="System"
        description="Backup, maintenance, data retention, and API settings for the IT portal."
      />

      <Card className="w-full max-w-none p-5 sm:p-8">
        <h2 className="text-lg font-bold text-slate-900">Backup & Maintenance</h2>
        <p className="mt-1 text-sm text-slate-500">Schedule automated backups and maintenance windows.</p>
        <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700">Backup frequency</label>
            <div className="mt-1.5 flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
              <span className="flex-1">Every 6 hours</span>
              <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Next scheduled backup</label>
            <p className="mt-1.5 text-sm font-medium text-slate-900">02:00 AM (daily)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Maintenance window</label>
            <input type="text" defaultValue="Sunday 02:00 – 04:00" className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
          </div>
        </div>
        <div className="mt-6 flex justify-end border-t border-slate-200 pt-5 sm:mt-8 sm:pt-6">
          <Button size="md" className="bg-[var(--accent)] text-white hover:opacity-95">Save</Button>
        </div>
      </Card>

      <Card className="w-full max-w-none p-5 sm:p-8">
        <h2 className="text-lg font-bold text-slate-900">Data retention</h2>
        <p className="mt-1 text-sm text-slate-500">How long to keep logs and temporary data.</p>
        <div className="mt-5 grid gap-4 sm:mt-6 sm:grid-cols-2 sm:gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700">Audit logs (days)</label>
            <input type="number" defaultValue={365} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Session and cache (days)</label>
            <input type="number" defaultValue={30} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
          </div>
        </div>
        <div className="mt-5 flex justify-end sm:mt-6">
          <Button size="md" className="bg-[var(--accent)] text-white hover:opacity-95">Save</Button>
        </div>
      </Card>

      <Card className="w-full max-w-none p-5 sm:p-8">
        <h2 className="text-lg font-bold text-slate-900">API & integrations</h2>
        <p className="mt-1 text-sm text-slate-500">External access and webhooks.</p>
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3 text-sm text-amber-800">
          API keys and webhook URLs are managed here. Rotate or add keys as needed for integrations.
        </div>
        <div className="mt-4 flex justify-end">
          <Button size="md" variant="outline">Manage API keys</Button>
        </div>
      </Card>
    </div>
  );
}

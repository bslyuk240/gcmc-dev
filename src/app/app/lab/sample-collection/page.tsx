"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { INTERNAL_PREFIX } from "@/lib/constants/navigation";
import { useLabStore } from "@/lib/hooks/use-lab-store";

function MobileMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-right text-sm font-medium text-slate-700">{value}</span>
    </div>
  );
}

const PRIORITY_STYLES: Record<string, string> = {
  Routine: "bg-slate-100 text-slate-600",
  Urgent: "bg-amber-100 text-amber-700",
  STAT: "bg-red-100 text-red-700 font-bold",
};

function fmtDateTime(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LabSampleCollectionPage() {
  const { tests } = useLabStore();

  const awaitingNurse = tests.filter((test) => test.status === "Pending");
  const recentlyCollected = tests.filter((test) => test.status === "Sample Collected");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sample Handover"
        description="Track doctor test orders awaiting nurse collection and review samples already handed to Lab."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-0 bg-amber-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Awaiting Nurse Collection</p>
          <p className="mt-1 text-2xl font-bold text-amber-600 sm:text-3xl">{awaitingNurse.length}</p>
          <p className="mt-0.5 text-xs text-slate-500">Doctor-ordered tests still waiting for nurse sample handoff</p>
        </Card>
        <Card className="border-0 bg-sky-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Samples Received</p>
          <p className="mt-1 text-2xl font-bold text-sky-700 sm:text-3xl">{recentlyCollected.length}</p>
          <p className="mt-0.5 text-xs text-slate-500">Ready for Lab processing</p>
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">Awaiting Nurse Handover</h3>
          <p className="mt-0.5 text-xs text-slate-400">Samples are collected in the nurses portal before they move into Lab processing.</p>
        </div>
        <div className="space-y-3 px-4 py-4 lg:hidden">
          {awaitingNurse.map((test) => (
            <div
              key={test.id}
              className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${
                test.priority === "STAT" ? "ring-1 ring-red-100" : test.priority === "Urgent" ? "ring-1 ring-amber-100" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{test.patientName}</p>
                  <p className="text-xs text-slate-400">{test.patientId}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs ${PRIORITY_STYLES[test.priority]}`}>{test.priority}</span>
              </div>
              <div className="mt-3 space-y-2">
                <MobileMeta label="Test" value={test.testName} />
                <MobileMeta label="Sample type" value={test.sampleType} />
                <MobileMeta label="Ordered by" value={test.orderedBy} />
                <MobileMeta label="Ordered at" value={fmtDateTime(test.orderedAt)} />
              </div>
            </div>
          ))}
          {awaitingNurse.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
              No tests are currently waiting for nurse collection.
            </div>
          )}
        </div>
        <div className="hidden overflow-x-auto lg:block">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {["Patient", "Test", "Sample Type", "Ordered By", "Ordered At", "Priority", "Action"].map((heading) => (
                  <th key={heading} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {awaitingNurse.map((test) => (
                <tr key={test.id} className={test.priority === "STAT" ? "bg-red-50/30" : test.priority === "Urgent" ? "bg-amber-50/20" : "hover:bg-slate-50"}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-900">{test.patientName}</p>
                    <p className="text-xs text-slate-400">{test.patientId}</p>
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-800">{test.testName}</p>
                    <p className="text-xs text-slate-400">{test.testCode}</p>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{test.sampleType}</td>
                  <td className="px-5 py-3 text-slate-600">{test.orderedBy}</td>
                  <td className="px-5 py-3 text-xs text-slate-400">{fmtDateTime(test.orderedAt)}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs ${PRIORITY_STYLES[test.priority]}`}>{test.priority}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs font-semibold text-slate-500">Awaiting nurses</span>
                  </td>
                </tr>
              ))}
              {awaitingNurse.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-400">
                    No tests are currently waiting for nurse collection.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="font-bold text-slate-900">Samples Received by Lab</h3>
            <p className="mt-0.5 text-xs text-slate-400">These samples were handed over by nurses and are ready for processing.</p>
          </div>
          <Link href={`${INTERNAL_PREFIX}/lab/processing`} className="text-sm font-semibold text-accent hover:underline">
            Open processing
          </Link>
        </div>
        <div className="space-y-3 px-4 py-4 md:hidden">
          {recentlyCollected.map((test) => (
            <div key={test.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {test.patientName} - {test.testName}
                  </p>
                  <p className="text-xs text-slate-400">{test.sampleCollectedBy || "--"}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs ${PRIORITY_STYLES[test.priority]}`}>{test.priority}</span>
              </div>
              <div className="mt-3 space-y-2">
                <MobileMeta label="Collected at" value={fmtDateTime(test.sampleCollectedAt)} />
                <MobileMeta label="Sample type" value={test.sampleType} />
              </div>
            </div>
          ))}
          {recentlyCollected.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
              No nurse-collected samples have reached Lab yet.
            </div>
          ) : null}
        </div>
        <div className="hidden divide-y divide-slate-100 md:block">
          {recentlyCollected.map((test) => (
            <div key={test.id} className="flex items-center gap-4 px-5 py-3">
              <div className="h-2 w-2 shrink-0 rounded-full bg-sky-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">{test.patientName} - {test.testName}</p>
                <p className="text-xs text-slate-400">
                  Collected by {test.sampleCollectedBy || "--"} / {fmtDateTime(test.sampleCollectedAt)}
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs ${PRIORITY_STYLES[test.priority]}`}>{test.priority}</span>
            </div>
          ))}
          {recentlyCollected.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-400">No nurse-collected samples have reached Lab yet.</div>
          ) : null}
        </div>
      </Card>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <strong className="text-slate-700">Flow:</strong> Doctor orders test, nurse collects sample in the nurses portal, nurse sends sample to Lab, Lab starts processing from the processing queue.
      </div>
    </div>
  );
}

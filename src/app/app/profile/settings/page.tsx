"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Toast, type ToastData } from "@/components/ui/toast";

export default function ProfileSettingsPage() {
  // Profile form
  const [displayName, setDisplayName] = useState("Dr. Julianne Smith");
  const [email, setEmail] = useState("julianne.smith@hospital.org");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);

  // Sessions
  const [sessions, setSessions] = useState([
    { id: "s1", label: "Chrome / Accra Hospital — Active now", current: true },
    { id: "s2", label: "Edge / Office terminal — 2 hours ago", current: false },
  ]);

  // Notifications
  const [emailNotif, setEmailNotif] = useState(true);
  const [shiftReminders, setShiftReminders] = useState(true);
  const [savingNotif, setSavingNotif] = useState(false);

  const [toast, setToast] = useState<ToastData | null>(null);

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setTimeout(() => {
      setSavingProfile(false);
      setToast({ message: "Profile updated successfully.", type: "success" });
    }, 600);
  }

  function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPwd || !newPwd) return;
    if (newPwd.length < 8) { setToast({ message: "New password must be at least 8 characters.", type: "error" }); return; }
    setSavingPwd(true);
    setTimeout(() => {
      setSavingPwd(false);
      setToast({ message: "Password updated successfully.", type: "success" });
      setCurrentPwd(""); setNewPwd("");
    }, 600);
  }

  function handleSignOutSession(sessionId: string) {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    setToast({ message: "Session signed out.", type: "info" });
  }

  function handleSaveNotifications() {
    setSavingNotif(true);
    setTimeout(() => {
      setSavingNotif(false);
      setToast({ message: "Notification preferences saved.", type: "success" });
    }, 500);
  }

  const inputCls = "mt-1.5 w-full max-w-md rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Update your profile, password, and preferences."
      />

      {/* Profile */}
      <Card>
        <h2 className="text-lg font-bold text-slate-900">Profile</h2>
        <p className="mt-1 text-sm text-slate-500">Your visible name and contact details. Changes may require HR approval.</p>
        <form onSubmit={handleSaveProfile} className="mt-6 space-y-5">
          <div>
            <label htmlFor="display-name" className="block text-sm font-medium text-slate-700">Display name</label>
            <input id="display-name" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-slate-700">Phone <span className="text-slate-400 font-normal">(optional)</span></label>
            <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+233 …" className={inputCls} />
          </div>
          <Button type="submit" disabled={savingProfile}>
            {savingProfile ? "Saving…" : "Save Profile"}
          </Button>
        </form>
      </Card>

      {/* Security */}
      <Card>
        <h2 className="text-lg font-bold text-slate-900">Security</h2>
        <p className="mt-1 text-sm text-slate-500">Password, active sessions, and two-factor authentication.</p>
        <div className="mt-6 space-y-6">
          {/* Change password */}
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Change password</h3>
            <p className="mt-1 text-sm text-slate-600">Use a strong password and avoid reusing it elsewhere.</p>
            <form onSubmit={handleUpdatePassword} className="mt-3 flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Current password</label>
                <input
                  type="password"
                  value={currentPwd}
                  onChange={(e) => setCurrentPwd(e.target.value)}
                  placeholder="Current password"
                  className="rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">New password</label>
                <input
                  type="password"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                />
              </div>
              <Button type="submit" variant="outline" size="md" disabled={savingPwd}>
                {savingPwd ? "Updating…" : "Update password"}
              </Button>
            </form>
          </div>

          {/* Active sessions */}
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Active sessions</h3>
            <p className="mt-1 text-sm text-slate-600">Devices where you are currently signed in.</p>
            <ul className="mt-3 space-y-2">
              {sessions.map((s) => (
                <li key={s.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
                  <span className="text-slate-700">{s.label}</span>
                  {s.current ? (
                    <span className="text-emerald-600 font-medium">This device</span>
                  ) : (
                    <button type="button" onClick={() => handleSignOutSession(s.id)} className="text-sm font-medium text-red-600 hover:underline">Sign out</button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Security status */}
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Security status</h3>
            <ul className="mt-2 space-y-2 text-sm text-slate-600">
              <li className="rounded-xl bg-slate-50 px-4 py-3">Password last changed 42 days ago</li>
              <li className="rounded-xl bg-amber-50 px-4 py-3 text-amber-800">MFA setup pending — <button type="button" className="underline font-medium">Enable now</button></li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Notifications */}
      <Card>
        <h2 className="text-lg font-bold text-slate-900">Notifications</h2>
        <p className="mt-1 text-sm text-slate-500">Choose how you receive updates about leave, shifts, and chats.</p>
        <div className="mt-6 space-y-4">
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-[var(--border)] bg-white px-4 py-3">
            <span className="text-sm font-medium text-slate-700">Email notifications</span>
            <input type="checkbox" checked={emailNotif} onChange={(e) => setEmailNotif(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-[var(--accent)]" />
          </label>
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-[var(--border)] bg-white px-4 py-3">
            <span className="text-sm font-medium text-slate-700">Leave and shift reminders</span>
            <input type="checkbox" checked={shiftReminders} onChange={(e) => setShiftReminders(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-[var(--accent)]" />
          </label>
        </div>
        <div className="mt-4">
          <Button size="md" variant="outline" onClick={handleSaveNotifications} disabled={savingNotif}>
            {savingNotif ? "Saving…" : "Save Preferences"}
          </Button>
        </div>
      </Card>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}

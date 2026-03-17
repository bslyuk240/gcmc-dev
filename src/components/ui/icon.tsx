import { cn } from "@/lib/utils/cn";

type IconName =
  | "dashboard"
  | "patients"
  | "calendar"
  | "billing"
  | "reports"
  | "support"
  | "search"
  | "bell"
  | "settings"
  | "chevron"
  | "plus"
  | "download"
  | "queue"
  | "play"
  | "user-add"
  | "view"
  | "hospital"
  | "status"
  | "group"
  | "money"
  | "pharmacy";

const common = "h-4 w-4";

export function Icon({
  name,
  className,
}: {
  name: IconName;
  className?: string;
}) {
  switch (name) {
    case "dashboard":
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn(common, className)}><path d="M3 13h8V3H3zM13 21h8v-6h-8zM13 11h8V3h-8zM3 21h8v-4H3z" /></svg>;
    case "patients":
    case "group":
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn(common, className)}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
    case "calendar":
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn(common, className)}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>;
    case "billing":
    case "money":
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn(common, className)}><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /><path d="M7 15h2" /></svg>;
    case "reports":
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn(common, className)}><path d="M12 20V10M18 20V4M6 20v-6" /></svg>;
    case "support":
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn(common, className)}><path d="M18 10a6 6 0 1 0-12 0v5a2 2 0 0 0 2 2h1" /><path d="M16 17h2a2 2 0 0 0 2-2v-5" /><path d="M9 21h6" /></svg>;
    case "search":
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn(common, className)}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.35-4.35" /></svg>;
    case "bell":
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn(common, className)}><path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" /><path d="M10 21a2 2 0 0 0 4 0" /></svg>;
    case "settings":
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn(common, className)}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 1-2 0 1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 1 0-2 1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 1 2 0 1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.23.32.47.66.6 1 .2.65.2 1.35 0 2-.13.34-.37.68-.6 1Z" /></svg>;
    case "chevron":
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn(common, className)}><path d="m9 18 6-6-6-6" /></svg>;
    case "plus":
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn(common, className)}><path d="M12 5v14M5 12h14" /></svg>;
    case "download":
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn(common, className)}><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>;
    case "queue":
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn(common, className)}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>;
    case "play":
      return <svg viewBox="0 0 24 24" fill="currentColor" className={cn(common, className)}><path d="M8 5v14l11-7z" /></svg>;
    case "user-add":
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn(common, className)}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M16 11h6" /></svg>;
    case "view":
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn(common, className)}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z" /><circle cx="12" cy="12" r="3" /></svg>;
    case "hospital":
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn(common, className)}><path d="M12 6v12M8 10h8M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" /></svg>;
    case "status":
      return <svg viewBox="0 0 24 24" fill="currentColor" className={cn(common, className)}><circle cx="12" cy="12" r="8" /></svg>;
    case "pharmacy":
      return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn(common, className)}><path d="M10 3h4a2 2 0 0 1 2 2v3H8V5a2 2 0 0 1 2-2Z" /><path d="M8 8h8a2 2 0 0 1 2 2v8a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3v-8a2 2 0 0 1 2-2Z" /><path d="M10 13h4M12 11v4" /></svg>;
  }
}

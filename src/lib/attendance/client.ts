import type {
  AttendanceRecord,
  AttendanceStatus,
} from "@/modules/workforce/attendance/types";

const STAFF_ATTENDANCE_ENDPOINT = "/api/staff/attendance";
const APP_ATTENDANCE_ENDPOINT = "/api/app/attendance";
const HR_ATTENDANCE_ENDPOINT = "/api/hr/attendance";

function localISODate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTimeParts(date: Date) {
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  return fetch(url, {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  }).then(async (response) => {
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error ?? `request_failed_${response.status}`);
    }
    return payload as T;
  });
}

export function todayAttendanceDate(date = new Date()) {
  return localISODate(date);
}

export function currentMonthRange(date = new Date()) {
  const from = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
  const to = localISODate(date);
  return { from, to };
}

export function formatAttendanceClockTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : formatTimeParts(date);
}

export function formatAttendanceDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

export function isLateClockIn(clockInAt: string | null | undefined) {
  if (!clockInAt) return false;
  const date = new Date(clockInAt);
  if (Number.isNaN(date.getTime())) return false;
  return date.getHours() > 7 || (date.getHours() === 7 && date.getMinutes() > 10);
}

export async function fetchStaffAttendanceRecords(filters?: {
  from?: string;
  to?: string;
  scope?: "today" | "range";
}): Promise<AttendanceRecord[]> {
  const params = new URLSearchParams();
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);
  if (filters?.scope) params.set("scope", filters.scope);

  const query = params.toString();
  const payload = await fetchJSON<{ records: AttendanceRecord[] }>(
    `${STAFF_ATTENDANCE_ENDPOINT}${query ? `?${query}` : ""}`,
  );
  return payload.records ?? [];
}

export async function fetchHrAttendanceRecords(filters?: {
  department?: string;
  from?: string;
  to?: string;
}): Promise<AttendanceRecord[]> {
  const params = new URLSearchParams();
  if (filters?.department) params.set("department", filters.department);
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);

  const query = params.toString();
  const payload = await fetchJSON<{ records: AttendanceRecord[] }>(
    `${HR_ATTENDANCE_ENDPOINT}${query ? `?${query}` : ""}`,
  );
  return payload.records ?? [];
}

export async function fetchAppAttendanceRecords(filters?: {
  from?: string;
  to?: string;
  scope?: "today" | "range";
}): Promise<AttendanceRecord[]> {
  const params = new URLSearchParams();
  if (filters?.from) params.set("from", filters.from);
  if (filters?.to) params.set("to", filters.to);
  if (filters?.scope) params.set("scope", filters.scope);

  const query = params.toString();
  const payload = await fetchJSON<{ records: AttendanceRecord[] }>(
    `${APP_ATTENDANCE_ENDPOINT}${query ? `?${query}` : ""}`,
  );
  return payload.records ?? [];
}

export async function clockInStaffAttendance(input: {
  attendanceDate: string;
  clockInAt: string;
  status: AttendanceStatus;
  unit?: string | null;
}) {
  return fetchJSON<{ record: AttendanceRecord }>(STAFF_ATTENDANCE_ENDPOINT, {
    method: "POST",
    body: JSON.stringify({
      action: "clock-in",
      attendanceDate: input.attendanceDate,
      clockInAt: input.clockInAt,
      status: input.status,
      unit: input.unit ?? undefined,
    }),
  });
}

export async function clockOutStaffAttendance(input: {
  attendanceDate: string;
  clockOutAt: string;
}) {
  return fetchJSON<{ record: AttendanceRecord }>(STAFF_ATTENDANCE_ENDPOINT, {
    method: "POST",
    body: JSON.stringify({
      action: "clock-out",
      attendanceDate: input.attendanceDate,
      clockOutAt: input.clockOutAt,
    }),
  });
}

export async function clockInAppAttendance(input: {
  attendanceDate: string;
  clockInAt: string;
  status: AttendanceStatus;
  unit?: string | null;
}) {
  return fetchJSON<{ record: AttendanceRecord }>(APP_ATTENDANCE_ENDPOINT, {
    method: "POST",
    body: JSON.stringify({
      action: "clock-in",
      attendanceDate: input.attendanceDate,
      clockInAt: input.clockInAt,
      status: input.status,
      unit: input.unit ?? undefined,
    }),
  });
}

export async function clockOutAppAttendance(input: {
  attendanceDate: string;
  clockOutAt: string;
}) {
  return fetchJSON<{ record: AttendanceRecord }>(APP_ATTENDANCE_ENDPOINT, {
    method: "POST",
    body: JSON.stringify({
      action: "clock-out",
      attendanceDate: input.attendanceDate,
      clockOutAt: input.clockOutAt,
    }),
  });
}

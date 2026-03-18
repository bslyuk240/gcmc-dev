const DEPARTMENT_ID_CODES: Record<string, string> = {
  doctors: "DOC",
  nurses: "NUR",
  pharmacy: "PHA",
  lab: "LAB",
  frontdesk: "FDS",
  accounts: "ACC",
  store: "STO",
  admin: "ADM",
  administration: "ADM",
  hr: "HRS",
  it: "ITS",
};

const NAME_PREFIX_TOKENS = new Set([
  "dr",
  "doctor",
  "nurse",
  "mr",
  "mrs",
  "ms",
  "miss",
  "prof",
  "professor",
]);

function normaliseDepartment(department?: string) {
  return (department ?? "").toLowerCase().replace(/[^a-z]/g, "");
}

function getDepartmentCode(department?: string) {
  const key = normaliseDepartment(department);

  if (DEPARTMENT_ID_CODES[key]) {
    return DEPARTMENT_ID_CODES[key];
  }

  const fallback = key.slice(0, 3).toUpperCase();
  return fallback.padEnd(3, "X") || "STA";
}

function getNameCode(name?: string) {
  const parts = (name ?? "")
    .split(/\s+/)
    .map((part) => part.replace(/[^a-z]/gi, ""))
    .filter(Boolean)
    .filter((part) => !NAME_PREFIX_TOKENS.has(part.toLowerCase()));

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase().padEnd(2, "X");
  }

  return "XX";
}

function getStableAlphaNumericCode(seed?: string) {
  let hash = 2166136261;

  for (const char of seed ?? "") {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36).toUpperCase().slice(-4).padStart(4, "0");
}

export function formatStaffDisplayId(input: {
  id?: string;
  name?: string;
  department?: string;
}) {
  const departmentCode = getDepartmentCode(input.department);
  const nameCode = getNameCode(input.name);
  const uniqueCode = getStableAlphaNumericCode(
    `${input.department ?? ""}:${input.name ?? ""}:${input.id ?? ""}`,
  );

  return `${departmentCode}.${nameCode}${uniqueCode}`;
}

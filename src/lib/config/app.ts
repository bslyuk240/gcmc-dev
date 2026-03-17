const requiredInProduction = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SESSION_SECRET",
  "CSRF_SECRET",
] as const;

export const appConfig = {
  appName:
    process.env.NEXT_PUBLIC_APP_NAME ?? "Group Christian Medical Centre",
  appShortName: process.env.NEXT_PUBLIC_APP_SHORT_NAME ?? "GCMC",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  logLevel: process.env.LOG_LEVEL ?? "info",
  privateBucketName:
    process.env.PRIVATE_BUCKET_NAME ?? "private-documents",
  publicBucketName: process.env.PUBLIC_BUCKET_NAME ?? "public-assets",
};

export function getMissingProductionEnv(): string[] {
  if (process.env.NODE_ENV !== "production") {
    return [];
  }

  return requiredInProduction.filter((key) => !process.env[key]);
}

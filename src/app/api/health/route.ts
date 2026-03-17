import { NextResponse } from "next/server";
import { appConfig, getMissingProductionEnv } from "@/lib/config/app";

export function GET() {
  return NextResponse.json({
    status: "ok",
    app: appConfig.appName,
    missingProductionEnv: getMissingProductionEnv(),
    timestamp: new Date().toISOString(),
  });
}

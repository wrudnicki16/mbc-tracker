/**
 * Cron Endpoint: Generate Measure Instances (Step 6)
 * Creates upcoming measure instances for scheduled appointments.
 * Can be triggered manually or via cron job.
 */

import { NextRequest, NextResponse } from "next/server";
import { generateUpcomingInstances, markExpiredInstances } from "@/lib/scheduling";

export async function POST(request: NextRequest) {
  // Optional: Add API key verification for production
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Generate instances for upcoming appointments
    const generated = await generateUpcomingInstances(7);

    // Mark expired instances
    const expiredCount = await markExpiredInstances();

    return NextResponse.json({
      success: true,
      generated: {
        appointments: generated.length,
        instances: generated.reduce((sum, g) => sum + g.instances.length, 0),
      },
      expired: expiredCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron job failed:", error);
    return NextResponse.json(
      { error: "Failed to generate instances" },
      { status: 500 }
    );
  }
}

// Also allow GET for easy manual trigger in demo
export async function GET() {
  try {
    const generated = await generateUpcomingInstances(7);
    const expiredCount = await markExpiredInstances();

    return NextResponse.json({
      success: true,
      generated: {
        appointments: generated.length,
        instances: generated.reduce((sum, g) => sum + g.instances.length, 0),
      },
      expired: expiredCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron job failed:", error);
    return NextResponse.json(
      { error: "Failed to generate instances" },
      { status: 500 }
    );
  }
}

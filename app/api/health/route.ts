
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


export async function GET() {
  try {
    const recapCount = await prisma.recap.count();

    return NextResponse.json({
      success: true,
      message: "Voice Income API is running",
      database: "connected",
      recapCount,
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Database connection failed",
      },
      { status: 500 }
    );
  }
}

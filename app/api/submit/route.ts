import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Application from "@/lib/models/Application";

export async function POST(req: Request) {
  try {
    // 1. Parse the incoming JSON payload from the frontend
    const body = await req.json();

    // 2. Ensure we have a database connection (survives hot-reloads)
    await dbConnect();

    // 3. Create a new document in MongoDB
    // We force the status to "booked" since they reached the final step
    const newApplication = await Application.create({
      ...body,
      status: "booked",
    });

    // 4. Return success to the frontend
    return NextResponse.json({ success: true, data: newApplication }, { status: 201 });
    
  } catch (error: any) {
    console.error("[SUBMIT API ERROR]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save application" },
      { status: 500 }
    );
  }
}
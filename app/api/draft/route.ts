import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import dbConnect from "@/lib/mongodb";
import Application from "@/lib/models/Application";

// LOAD PROGRESS ON SIGN-IN
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await dbConnect();
    
    // Find the specific draft for this user
    const record = await Application.findOne({ clerkUserId: userId });
    
    return NextResponse.json({ draft: record || null });
  } catch (error) {
    console.error("Database Get Error:", error);
    return NextResponse.json({ error: "Failed to fetch draft" }, { status: 500 });
  }
}

// AUTO-SAVE PROGRESS DURING CHAT
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { draft } = await req.json();
    await dbConnect();
    
    // Find the document by Clerk ID and update it. If it doesn't exist, create it (upsert).
    await Application.findOneAndUpdate(
      { clerkUserId: userId },
      { ...draft, clerkUserId: userId },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Database Post Error:", error);
    return NextResponse.json({ error: "Failed to save draft" }, { status: 500 });
  }
}
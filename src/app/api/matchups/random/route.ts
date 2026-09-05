import { NextResponse } from "next/server";
import { getRandomLiveMatchup } from "@/db/queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const exclude = searchParams.get("exclude") ?? undefined;
  const matchup = await getRandomLiveMatchup(exclude);
  return NextResponse.json({ matchupId: matchup?.id ?? null });
}

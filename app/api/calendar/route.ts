import { NextRequest, NextResponse } from "next/server";
import { classifyText, hydrateItems } from "@/lib/claude";

/**
 * GET /api/calendar
 * Fetches upcoming Google Calendar events and classifies them for action items.
 * Requires GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN in env.
 */
export async function GET(req: NextRequest) {
  try {
    const events = await fetchCalendarEvents();
    if (!events.length) return NextResponse.json({ items: [] });

    const text = events
      .map(
        (e: { summary: string; start: string; description?: string; attendees: string }) =>
          `Event: ${e.summary}\nDate: ${e.start}\nDescription: ${e.description ?? "none"}\nAttendees: ${e.attendees}`
      )
      .join("\n\n---\n\n");

    const raw = await classifyText("Calendar", text);
    const items = hydrateItems(raw, "Calendar");

    return NextResponse.json({ items });
  } catch (err) {
    console.error("[calendar]", err);
    return NextResponse.json({ error: "Calendar fetch failed" }, { status: 500 });
  }
}

async function fetchCalendarEvents() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    console.warn("[calendar] Google credentials not configured — returning empty");
    return [];
  }

  // Exchange refresh token for access token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  const now = new Date().toISOString();
  const weekOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const eventsRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&timeMax=${weekOut}&singleEvents=true&orderBy=startTime&maxResults=50`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await eventsRes.json();

  return (data.items ?? []).map((e: Record<string, unknown>) => ({
    summary: e.summary ?? "Untitled",
    start: (e.start as Record<string, string>)?.dateTime ?? (e.start as Record<string, string>)?.date,
    description: e.description,
    attendees: Array.isArray(e.attendees)
      ? (e.attendees as Record<string, string>[]).map((a) => a.email).join(", ")
      : "none",
  }));
}

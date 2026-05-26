import { NextResponse } from "next/server";
import { writePending } from "@/lib/fileQueue";
import { randomUUID } from "crypto";

// Only process emails from these senders
const ALLOWED_SENDERS = [
  "rick@robyncg.com",
  "maria@robyncg.com",
  "richard@robyncg.com",
];

const GMAIL_QUERY = `in:inbox newer_than:14d (${ALLOWED_SENDERS.map((e) => `from:${e}`).join(" OR ")})`;

export async function POST() {
  try {
    const messages = await fetchGmailMessages();
    if (!messages.length) {
      return NextResponse.json({ error: "no_messages" }, { status: 404 });
    }

    const text = messages
      .map((m) => `From: ${m.from}\nSubject: ${m.subject}\nDate: ${m.date}\n\n${m.snippet}`)
      .join("\n\n---\n\n");

    const id = randomUUID();
    writePending({ id, source: "Gmail", text });
    return NextResponse.json({ id, status: "pending" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function fetchGmailMessages() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error("Google credentials not configured — add them to .env.local");
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
  const { access_token } = await tokenRes.json();

  // Fetch matching messages (Rick + Maria only, last 14 days)
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(GMAIL_QUERY)}&maxResults=30`,
    { headers: { Authorization: `Bearer ${access_token}` } }
  );
  const listData = await listRes.json();
  const messageIds: string[] = (listData.messages ?? []).map((m: { id: string }) => m.id);

  if (!messageIds.length) return [];

  const messages = await Promise.all(
    messageIds.map(async (id) => {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${access_token}` } }
      );
      const msg = await msgRes.json();
      const headers: { name: string; value: string }[] = msg.payload?.headers ?? [];
      const get = (name: string) => headers.find((h) => h.name === name)?.value ?? "";
      return {
        from: get("From"),
        subject: get("Subject"),
        date: get("Date"),
        snippet: msg.snippet ?? "",
      };
    })
  );

  return messages;
}

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  if (!url.startsWith("https://docs.google.com/spreadsheets/")) {
    return NextResponse.json({ error: "Only Google Sheets URLs are allowed" }, { status: 403 });
  }

  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: {
        Accept: "text/csv,text/plain,*/*",
        // Mimic a plain HTTP client so Google doesn't serve a login-redirect HTML page
        "User-Agent": "rcg-ops-tower/1.0",
      },
    });

    const contentType = res.headers.get("content-type") ?? "";

    // Google redirected to accounts.google.com login page — sheet isn't public
    if (contentType.includes("text/html")) {
      return NextResponse.json(
        { error: "not_public" },
        { status: 403 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: `Google returned ${res.status}` },
        { status: res.status }
      );
    }

    const text = await res.text();

    // Double-check: if the body looks like HTML despite Content-Type, still block it
    if (text.trimStart().startsWith("<!DOCTYPE") || text.trimStart().startsWith("<html")) {
      return NextResponse.json({ error: "not_public" }, { status: 403 });
    }

    return new NextResponse(text, {
      headers: { "Content-Type": "text/csv; charset=utf-8" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

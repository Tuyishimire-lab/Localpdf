import { NextResponse } from 'next/server';

// ─────────────────────────────────────────────────────────────────────────────
// In-memory rate limiter
// Limits each IP to MAX_REQUESTS submissions per WINDOW_MS.
// Note: persists within a warm serverless instance. For multi-instance
// production scenarios, replace with Upstash Redis (@upstash/ratelimit).
// ─────────────────────────────────────────────────────────────────────────────
const rateLimitMap = new Map();
const MAX_REQUESTS = 5;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

function getClientIp(req) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

function isRateLimited(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  if (record.count >= MAX_REQUESTS) return true;

  rateLimitMap.set(ip, { ...record, count: record.count + 1 });
  return false;
}

// Prune old entries to avoid memory leaks on long-lived instances
function pruneRateLimitMap() {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetAt) rateLimitMap.delete(ip);
  }
}

export async function POST(req) {
  try {
    // ── Rate limit check ────────────────────────────────────────────────────
    const ip = getClientIp(req);
    pruneRateLimitMap();

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before sending another message.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { name, email, subject, message, honeypot } = body;

    // ── Honeypot check (bots fill hidden fields, humans don't) ──────────────
    if (honeypot) {
      // Return 200 to fool the bot — don't reveal we caught it
      return NextResponse.json({ success: true });
    }

    // ── Basic validation ────────────────────────────────────────────────────
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required.' },
        { status: 400 }
      );
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    // Limit field lengths to prevent abuse
    if (name.length > 100 || subject?.length > 200 || message.length > 5000) {
      return NextResponse.json(
        { error: 'Message content is too long.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('RESEND_API_KEY is not defined in environment variables');
      return NextResponse.json(
        { error: 'Email service is not configured.' },
        { status: 500 }
      );
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'LocalPDF Contact <onboarding@resend.dev>',
        to: 'tuyishime1angel@gmail.com',
        subject: `[LocalPDF Contact] ${subject || 'New Message'}`,
        reply_to: email,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f8fafc;">
            <h2 style="color: #ff4757; margin-bottom: 20px;">New Message from LocalPDF</h2>
            <p><strong>From:</strong> ${name} (&lt;${email}&gt;)</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p><strong>Message:</strong></p>
            <div style="background-color: white; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0; white-space: pre-wrap; line-height: 1.5; color: #334155;">
              ${message.replace(/\n/g, '<br />')}
            </div>
          </div>
        `,
      }),
    });

    const data = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend API error:', data);
      return NextResponse.json(
        { error: data.message || 'Failed to send email via Resend API.' },
        { status: resendResponse.status }
      );
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Internal server error occurred.' },
      { status: 500 }
    );
  }
}

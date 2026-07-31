/**
 * @jest-environment node
 *
 * Tests for /api/send POST handler.
 * We call the handler directly (no HTTP server needed) and mock:
 *   - global.fetch  → Resend API call
 *   - process.env.RESEND_API_KEY
 *
 * Rate-limit isolation: the rateLimitMap is module-level state that persists
 * across imports within the same jest worker. We use jest.resetModules() +
 * dynamic import in tests that need a fresh rate-limit window.
 */

// Helper: build a minimal Next.js-compatible Request object
function makeRequest({ body = {}, ip = '1.2.3.4' } = {}) {
  return new Request('http://localhost/api/send', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: JSON.stringify(body),
  });
}

// Valid body that passes all validation
const validBody = {
  name: 'Test User',
  email: 'test@example.com',
  subject: 'Hello',
  message: 'This is a test message.',
  honeypot: '',
};

beforeEach(() => {
  process.env.RESEND_API_KEY = 'test-resend-key';
  // Mock the Resend API to succeed
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ id: 'mock-email-id-123' }),
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

// ── Validation tests ────────────────────────────────────────────────────────

describe('/api/send — input validation', () => {
  let POST;

  beforeAll(async () => {
    jest.resetModules();
    ({ POST } = await import('../../src/app/api/send/route.js'));
  });

  test('returns 400 when name is missing', async () => {
    const req = makeRequest({ body: { ...validBody, name: '' }, ip: '1.1.1.1' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    // Route returns a single generic message for any missing required field
    expect(json.error).toMatch(/required/i);
  });

  test('returns 400 when email is missing', async () => {
    const req = makeRequest({ body: { ...validBody, email: '' }, ip: '1.1.1.2' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test('returns 400 when message is missing', async () => {
    const req = makeRequest({ body: { ...validBody, message: '' }, ip: '1.1.1.3' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test('returns 400 for an invalid email format', async () => {
    const req = makeRequest({ body: { ...validBody, email: 'not-an-email' }, ip: '1.1.1.4' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    // Route returns: "Please enter a valid email address."
    expect(json.error).toMatch(/valid email/i);
  });

  test('returns 400 when message exceeds 5000 characters', async () => {
    const req = makeRequest({ body: { ...validBody, message: 'x'.repeat(5001) }, ip: '1.1.1.5' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    // Route returns: "Message content is too long."
    expect(json.error).toMatch(/too long/i);
  });

  test('returns 400 when name exceeds 100 characters', async () => {
    const req = makeRequest({ body: { ...validBody, name: 'a'.repeat(101) }, ip: '1.1.1.6' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/too long/i);
  });
});

// ── Honeypot tests ──────────────────────────────────────────────────────────

describe('/api/send — honeypot', () => {
  let POST;

  beforeAll(async () => {
    jest.resetModules();
    ({ POST } = await import('../../src/app/api/send/route.js'));
  });

  test('returns 200 silently when honeypot field is filled (bot trap)', async () => {
    const req = makeRequest({ body: { ...validBody, honeypot: 'I am a bot' } });
    const res = await POST(req);
    expect(res.status).toBe(200);
    // Resend API should NOT be called — we just silently return success
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('does not return an error body when honeypot is triggered', async () => {
    const req = makeRequest({ body: { ...validBody, honeypot: 'bot content' } });
    const res = await POST(req);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.error).toBeUndefined();
  });
});

// ── Rate limiting tests ─────────────────────────────────────────────────────

describe('/api/send — rate limiting', () => {
  test('allows the first 5 requests from the same IP', async () => {
    // Fresh module to get a clean rateLimitMap
    jest.resetModules();
    const { POST } = await import('../../src/app/api/send/route.js');
    const ip = '10.0.0.1';

    for (let i = 0; i < 5; i++) {
      const req = makeRequest({ body: validBody, ip });
      const res = await POST(req);
      expect(res.status).not.toBe(429);
    }
  });

  test('returns 429 on the 6th request from the same IP', async () => {
    jest.resetModules();
    const { POST } = await import('../../src/app/api/send/route.js');
    const ip = '10.0.0.2';

    // Exhaust the quota (5 requests)
    for (let i = 0; i < 5; i++) {
      const req = makeRequest({ body: validBody, ip });
      await POST(req);
    }

    // 6th should be rate-limited
    const req = makeRequest({ body: validBody, ip });
    const res = await POST(req);
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toMatch(/too many/i);
  });

  test('different IPs have independent rate limit buckets', async () => {
    jest.resetModules();
    const { POST } = await import('../../src/app/api/send/route.js');

    // Exhaust one IP
    for (let i = 0; i < 5; i++) {
      await POST(makeRequest({ body: validBody, ip: '10.0.1.1' }));
    }

    // Different IP should still be allowed
    const res = await POST(makeRequest({ body: validBody, ip: '10.0.1.2' }));
    expect(res.status).not.toBe(429);
  });
});

// ── Successful send ─────────────────────────────────────────────────────────

describe('/api/send — successful email', () => {
  let POST;

  beforeAll(async () => {
    jest.resetModules();
    ({ POST } = await import('../../src/app/api/send/route.js'));
  });

  test('returns 200 with success:true for a valid request', async () => {
    const req = makeRequest({ body: validBody, ip: '192.168.1.1' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  test('calls the Resend API with correct Authorization header', async () => {
    const req = makeRequest({ body: validBody, ip: '192.168.1.2' });
    await POST(req);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-resend-key',
        }),
      })
    );
  });

  test('returns 500 when RESEND_API_KEY is not set', async () => {
    jest.resetModules();
    const { POST: freshPOST } = await import('../../src/app/api/send/route.js');
    delete process.env.RESEND_API_KEY;
    const req = makeRequest({ body: validBody, ip: '192.168.1.3' });
    const res = await freshPOST(req);
    expect(res.status).toBe(500);
    process.env.RESEND_API_KEY = 'test-resend-key'; // restore
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

const getUserMock = vi.fn();
const rpcMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: getUserMock },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc: rpcMock }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { POST } from "@/app/api/billing/coupon/route";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/billing/coupon", {
    method: "POST",
    body: JSON.stringify(body),
  }) as never;
}

describe("POST /api/billing/coupon — authentication & coupon redemption", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    rpcMock.mockReset();
  });

  it("rejects unauthenticated requests with 401 (no coupon logic runs)", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const res = await POST(makeRequest({ code: "SID_DRDROID" }));
    expect(res.status).toBe(401);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid coupon code with 400 without touching the database", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const res = await POST(makeRequest({ code: "WRONG-CODE" }));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toMatch(/isn't valid/);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("is case-insensitive when matching the valid coupon code", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    rpcMock.mockResolvedValue({ data: 5, error: null });

    const res = await POST(makeRequest({ code: "sid_drdroid" }));
    expect(res.status).toBe(200);
  });

  it("grants credits atomically via the service-role RPC on first redemption", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    rpcMock.mockResolvedValue({ data: 5, error: null });

    const res = await POST(makeRequest({ code: "SID_DRDROID" }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.credits).toBe(5);
    expect(rpcMock).toHaveBeenCalledWith("redeem_coupon", expect.objectContaining({ p_user_id: "user-1" }));
  });

  it("prevents double redemption: second attempt is rejected when the RPC reports already-used (race-safe guard)", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    // The `redeem_coupon` SQL function returns NULL when `coupon_used` is already set,
    // which is how two concurrent requests can't both succeed (WHERE coupon_used IS NULL).
    rpcMock.mockResolvedValue({ data: null, error: null });

    const res = await POST(makeRequest({ code: "SID_DRDROID" }));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toMatch(/already redeemed/);
  });

  it("returns 500 without leaking internals when the database RPC errors out (Supabase outage)", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    rpcMock.mockResolvedValue({ data: null, error: { message: "connection refused" } });

    const res = await POST(makeRequest({ code: "SID_DRDROID" }));
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.error).not.toContain("connection refused");
  });

  it("rejects malformed JSON bodies with 400 instead of throwing", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const req = new Request("http://localhost/api/billing/coupon", {
      method: "POST",
      body: "not-json",
    }) as never;

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

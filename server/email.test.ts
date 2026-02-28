import { describe, it, expect, vi } from "vitest";

// Test the email helper module structure and logic
// We mock fetch to avoid real API calls in tests

describe("Email helper", () => {
  it("should return false when RESEND_API_KEY is not set", async () => {
    const originalKey = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;

    // Re-import to pick up env change
    const { sendEmail } = await import("./email");
    const result = await sendEmail({
      to: "test@example.com",
      subject: "Test",
      html: "<p>Test</p>",
    });

    expect(result).toBe(false);
    process.env.RESEND_API_KEY = originalKey;
  });

  it("should call Resend API with correct payload when key is set", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "mock-email-id" }),
    });
    vi.stubGlobal("fetch", mockFetch);
    process.env.RESEND_API_KEY = "re_test_key";

    // Clear module cache to pick up new env
    vi.resetModules();
    const { sendEmail } = await import("./email");

    const result = await sendEmail({
      to: "trainer@example.com",
      subject: "Bem-vindo ao FITPRO",
      html: "<p>Olá!</p>",
      text: "Olá!",
    });

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer re_test_key",
        }),
      })
    );

    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("sendWelcomeEmail should include trainer name in HTML", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "mock-id" }),
    });
    vi.stubGlobal("fetch", mockFetch);
    process.env.RESEND_API_KEY = "re_test_key";

    vi.resetModules();
    const { sendWelcomeEmail } = await import("./email");

    await sendWelcomeEmail("trainer@example.com", "João Silva");

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.html).toContain("João Silva");
    expect(callBody.subject).toContain("FITPRO");

    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("sendPasswordResetEmail should include reset URL in HTML", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "mock-id" }),
    });
    vi.stubGlobal("fetch", mockFetch);
    process.env.RESEND_API_KEY = "re_test_key";

    vi.resetModules();
    const { sendPasswordResetEmail } = await import("./email");

    const resetUrl = "https://fitpro.app/reset-password?token=abc123";
    await sendPasswordResetEmail("trainer@example.com", "Maria", resetUrl);

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.html).toContain(resetUrl);
    expect(callBody.html).toContain("Maria");

    vi.unstubAllGlobals();
    vi.resetModules();
  });
});

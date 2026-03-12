import { describe, it, expect } from "vitest";
import { getSessionCookieOptions } from "./cookies";
import type { Request } from "express";

describe("getSessionCookieOptions", () => {
  it("should return secure options when protocol is https", () => {
    const req = {
      protocol: "https",
      headers: {},
    } as unknown as Request;

    const options = getSessionCookieOptions(req);

    expect(options.secure).toBe(true);
    expect(options.sameSite).toBe("none");
    expect(options.httpOnly).toBe(true);
    expect(options.path).toBe("/");
  });

  it("should return non-secure options when protocol is http and no forwarded proto", () => {
    const req = {
      protocol: "http",
      headers: {},
    } as unknown as Request;

    const options = getSessionCookieOptions(req);

    expect(options.secure).toBe(false);
    expect(options.sameSite).toBe("lax");
  });

  it("should return secure options when x-forwarded-proto is https", () => {
    const req = {
      protocol: "http",
      headers: {
        "x-forwarded-proto": "https",
      },
    } as unknown as Request;

    const options = getSessionCookieOptions(req);

    expect(options.secure).toBe(true);
    expect(options.sameSite).toBe("none");
  });

  it("should return secure options when x-forwarded-proto contains https", () => {
    const req = {
      protocol: "http",
      headers: {
        "x-forwarded-proto": "http, https",
      },
    } as unknown as Request;

    const options = getSessionCookieOptions(req);

    expect(options.secure).toBe(true);
    expect(options.sameSite).toBe("none");
  });

  it("should return non-secure options when x-forwarded-proto is only http", () => {
    const req = {
      protocol: "http",
      headers: {
        "x-forwarded-proto": "http",
      },
    } as unknown as Request;

    const options = getSessionCookieOptions(req);

    expect(options.secure).toBe(false);
    expect(options.sameSite).toBe("lax");
  });

  it("should handle x-forwarded-proto as an array", () => {
    const req = {
      protocol: "http",
      headers: {
        "x-forwarded-proto": ["http", "https"],
      },
    } as unknown as Request;

    const options = getSessionCookieOptions(req);

    expect(options.secure).toBe(true);
    expect(options.sameSite).toBe("none");
  });
});

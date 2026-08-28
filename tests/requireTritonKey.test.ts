import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { requireTritonKey } from "../server/middleware/requireTritonKey.js";
import type { Request, Response } from "express";

function createMockReqRes(headers: Record<string, string> = {}) {
  const req = {
    headers: { ...headers },
  } as unknown as Request;

  let statusCode = 200;
  let responseData: any = null;

  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(data: any) {
      responseData = data;
      return this;
    },
  } as unknown as Response;

  const next = vi.fn();

  return { req, res, next, getStatus: () => statusCode, getData: () => responseData };
}

describe("requireTritonKey Middleware", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns 403 when TRITON_KEY is not configured in server environment", () => {
    delete process.env.TRITON_KEY;
    const { req, res, next, getStatus, getData } = createMockReqRes({
      "x-triton-key": "some-key",
    });

    requireTritonKey(req, res, next);

    expect(getStatus()).toBe(403);
    expect(getData()?.error).toContain("Server misconfiguration");
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when authorization key header is missing", () => {
    process.env.TRITON_KEY = "Secret123";
    const { req, res, next, getStatus, getData } = createMockReqRes({});

    requireTritonKey(req, res, next);

    expect(getStatus()).toBe(401);
    expect(getData()?.error).toContain("Missing authorization key");
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when authorization key is invalid/mismatched", () => {
    process.env.TRITON_KEY = "Secret123";
    const { req, res, next, getStatus, getData } = createMockReqRes({
      "x-triton-key": "WrongKey",
    });

    requireTritonKey(req, res, next);

    expect(getStatus()).toBe(403);
    expect(getData()?.error).toContain("Forbidden");
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() when valid X-Triton-Key header is provided", () => {
    process.env.TRITON_KEY = "Secret123";
    const { req, res, next } = createMockReqRes({
      "x-triton-key": "Secret123",
    });

    requireTritonKey(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("calls next() when valid X-Vercel-Secret header is provided", () => {
    process.env.TRITON_KEY = "Secret123";
    const { req, res, next } = createMockReqRes({
      "x-vercel-secret": "Secret123",
    });

    requireTritonKey(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("calls next() when valid Bearer token is provided", () => {
    process.env.TRITON_KEY = "Secret123";
    const { req, res, next } = createMockReqRes({
      authorization: "Bearer Secret123",
    });

    requireTritonKey(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});

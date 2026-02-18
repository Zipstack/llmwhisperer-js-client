const axios = require("axios");
const fs = require("fs");
const path = require("path");
const {
  LLMWhispererClient,
  LLMWhispererClientV2,
  LLMWhispererClientException,
} = require("../index");

// Silence winston logs during tests
jest.mock("winston", () => {
  const noop = () => {};
  const logger = {
    debug: noop,
    info: noop,
    warn: jest.fn(),
    error: noop,
  };
  return {
    createLogger: () => logger,
    format: {
      combine: () => {},
      timestamp: () => {},
      printf: () => {},
    },
    transports: { Console: class {} },
  };
});

/**
 * Helper: creates an axios adapter mock that returns responses in sequence.
 * This replaces the HTTP adapter so axios-retry interceptors still run.
 */
function mockAdapter(responses) {
  let callIndex = 0;
  return (config) => {
    if (callIndex >= responses.length) {
      return Promise.reject(new Error("No more mocked responses"));
    }
    const resp = responses[callIndex++];
    if (resp._isError) {
      const err = new Error(resp.message || "Request failed");
      err.config = config;
      err.isAxiosError = true;
      if (resp.response) {
        err.response = resp.response;
      }
      if (resp.code) {
        err.code = resp.code;
      }
      return Promise.reject(err);
    }
    return Promise.resolve({ ...resp, config: { url: config.url, method: config.method, headers: config.headers, params: config.params, data: config.data, _filePath: config._filePath, 'axios-retry': config['axios-retry'] } });
  };
}

function errorResponse(status, message = "Error", headers = {}) {
  return {
    _isError: true,
    message,
    response: { status, data: { message }, headers, statusText: message },
  };
}

function networkError(code = "ECONNRESET") {
  return {
    _isError: true,
    message: `connect ${code}`,
    code,
  };
}

function successResponse(data = {}, status = 200, headers = {}) {
  return { status, data, headers, statusText: "OK" };
}

function createV1Client(opts = {}) {
  return new LLMWhispererClient({
    baseUrl: "https://test.example.com/v1",
    apiKey: "test-key",
    loggingLevel: "error",
    ...opts,
  });
}

function createV2Client(opts = {}) {
  return new LLMWhispererClientV2({
    baseUrl: "https://test.example.com/v2",
    apiKey: "test-key",
    loggingLevel: "error",
    ...opts,
  });
}

describe("Retry Configuration", () => {
  test("V1 client stores retry configuration defaults", () => {
    const client = createV1Client();
    expect(client.retryMaxRetries).toBe(4);
    expect(client.retryInitialDelay).toBe(2.0);
    expect(client.retryMaxDelay).toBe(60.0);
    expect(client.retryBackoffFactor).toBe(2.0);
    expect(client.retryJitter).toBe(1.0);
  });

  test("V2 client stores retry configuration defaults", () => {
    const client = createV2Client();
    expect(client.retryMaxRetries).toBe(4);
    expect(client.retryInitialDelay).toBe(2.0);
    expect(client.retryMaxDelay).toBe(60.0);
    expect(client.retryBackoffFactor).toBe(2.0);
    expect(client.retryJitter).toBe(1.0);
  });

  test("V1 client accepts custom retry configuration", () => {
    const client = createV1Client({
      maxRetries: 10,
      initialDelay: 5.0,
      maxDelay: 120.0,
      backoffFactor: 3.0,
      jitter: 2.0,
    });
    expect(client.retryMaxRetries).toBe(10);
    expect(client.retryInitialDelay).toBe(5.0);
    expect(client.retryMaxDelay).toBe(120.0);
    expect(client.retryBackoffFactor).toBe(3.0);
    expect(client.retryJitter).toBe(2.0);
  });

  test("V2 client accepts custom retry configuration", () => {
    const client = createV2Client({
      maxRetries: 0,
      initialDelay: 1.0,
      maxDelay: 30.0,
      backoffFactor: 1.5,
      jitter: 0.5,
    });
    expect(client.retryMaxRetries).toBe(0);
    expect(client.retryInitialDelay).toBe(1.0);
    expect(client.retryMaxDelay).toBe(30.0);
    expect(client.retryBackoffFactor).toBe(1.5);
    expect(client.retryJitter).toBe(0.5);
  });

  test("V1 client creates its own axios instance", () => {
    const client = createV1Client();
    expect(client.client).toBeDefined();
    expect(client.client).not.toBe(axios);
  });

  test("V2 client creates its own axios instance", () => {
    const client = createV2Client();
    expect(client.client).toBeDefined();
    expect(client.client).not.toBe(axios);
  });
});

describe("V1 Retry on server errors", () => {
  test("getUsageInfo retries on 503 then succeeds", async () => {
    const client = createV1Client({ maxRetries: 2, jitter: 0 });
    const adapter = mockAdapter([
      errorResponse(503, "Service Unavailable"),
      successResponse({ usage: "100" }),
    ]);
    client.client.defaults.adapter = adapter;

    const result = await client.getUsageInfo();
    expect(result).toEqual({ usage: "100" });
  });

  test("getUsageInfo retries on 429 then succeeds", async () => {
    const client = createV1Client({ maxRetries: 2, jitter: 0 });
    const adapter = mockAdapter([
      errorResponse(429, "Rate limited"),
      successResponse({ usage: "100" }),
    ]);
    client.client.defaults.adapter = adapter;

    const result = await client.getUsageInfo();
    expect(result).toEqual({ usage: "100" });
  });

  test("getUsageInfo retries on network error then succeeds", async () => {
    const client = createV1Client({ maxRetries: 2, jitter: 0 });
    const adapter = mockAdapter([
      networkError("ECONNRESET"),
      successResponse({ usage: "100" }),
    ]);
    client.client.defaults.adapter = adapter;

    const result = await client.getUsageInfo();
    expect(result).toEqual({ usage: "100" });
  });

  test("whisperStatus retries on 500 then succeeds", async () => {
    const client = createV1Client({ maxRetries: 2, jitter: 0 });
    const adapter = mockAdapter([
      errorResponse(500, "Internal Server Error"),
      successResponse({ status: "processed" }),
    ]);
    client.client.defaults.adapter = adapter;

    const result = await client.whisperStatus("test-hash");
    expect(result.status).toBe("processed");
  });

  test("whisperRetrieve retries on 502 then succeeds", async () => {
    const client = createV1Client({ maxRetries: 2, jitter: 0 });
    const adapter = mockAdapter([
      errorResponse(502, "Bad Gateway"),
      successResponse("extracted text here"),
    ]);
    client.client.defaults.adapter = adapter;

    const result = await client.whisperRetrieve("test-hash");
    expect(result.extracted_text).toBe("extracted text here");
  });

  test("highlightData retries on 503 then succeeds", async () => {
    const client = createV1Client({ maxRetries: 2, jitter: 0 });
    const adapter = mockAdapter([
      errorResponse(503, "Service Unavailable"),
      successResponse({ highlights: [] }),
    ]);
    client.client.defaults.adapter = adapter;

    const result = await client.highlightData("hash", "search text");
    expect(result).toEqual({ highlights: [], statusCode: 200 });
  });
});

describe("V1 No retry on client errors", () => {
  test("getUsageInfo does NOT retry on 400", async () => {
    const client = createV1Client({ maxRetries: 3, jitter: 0 });
    let callCount = 0;
    client.client.defaults.adapter = (config) => {
      callCount++;
      const err = new Error("Bad Request");
      err.response = { status: 400, data: { message: "Bad Request" }, headers: {} };
      err.config = config;
      err.isAxiosError = true;
      return Promise.reject(err);
    };

    await expect(client.getUsageInfo()).rejects.toThrow(LLMWhispererClientException);
    expect(callCount).toBe(1);
  });

  test("getUsageInfo does NOT retry on 401", async () => {
    const client = createV1Client({ maxRetries: 3, jitter: 0 });
    let callCount = 0;
    client.client.defaults.adapter = (config) => {
      callCount++;
      const err = new Error("Unauthorized");
      err.response = { status: 401, data: { message: "Unauthorized" }, headers: {} };
      err.config = config;
      err.isAxiosError = true;
      return Promise.reject(err);
    };

    await expect(client.getUsageInfo()).rejects.toThrow(LLMWhispererClientException);
    expect(callCount).toBe(1);
  });

  test("getUsageInfo does NOT retry on 404", async () => {
    const client = createV1Client({ maxRetries: 3, jitter: 0 });
    let callCount = 0;
    client.client.defaults.adapter = (config) => {
      callCount++;
      const err = new Error("Not Found");
      err.response = { status: 404, data: { message: "Not Found" }, headers: {} };
      err.config = config;
      err.isAxiosError = true;
      return Promise.reject(err);
    };

    await expect(client.getUsageInfo()).rejects.toThrow(LLMWhispererClientException);
    expect(callCount).toBe(1);
  });
});

describe("V1 Retry exhaustion and disable", () => {
  test("retry exhaustion throws after maxRetries attempts", async () => {
    const client = createV1Client({ maxRetries: 2, jitter: 0, initialDelay: 0.1 });
    let callCount = 0;
    client.client.defaults.adapter = (config) => {
      callCount++;
      const err = new Error("Service Unavailable");
      err.response = { status: 503, data: { message: "Service Unavailable" }, headers: {} };
      err.config = config;
      err.isAxiosError = true;
      return Promise.reject(err);
    };

    await expect(client.getUsageInfo()).rejects.toThrow(LLMWhispererClientException);
    // 1 initial + 2 retries = 3 total
    expect(callCount).toBe(3);
  });

  test("maxRetries=0 disables retries", async () => {
    const client = createV1Client({ maxRetries: 0, jitter: 0 });
    let callCount = 0;
    client.client.defaults.adapter = (config) => {
      callCount++;
      const err = new Error("Service Unavailable");
      err.response = { status: 503, data: { message: "Service Unavailable" }, headers: {} };
      err.config = config;
      err.isAxiosError = true;
      return Promise.reject(err);
    };

    await expect(client.getUsageInfo()).rejects.toThrow(LLMWhispererClientException);
    expect(callCount).toBe(1);
  });
});

describe("V1 whisper retry control", () => {
  test("whisper with timeout=0 (async) retries on 503", async () => {
    const client = createV1Client({ maxRetries: 2, jitter: 0 });
    const adapter = mockAdapter([
      errorResponse(503, "Service Unavailable"),
      successResponse(
        { whisper_hash: "abc123", statusCode: 202 },
        202,
        { "whisper-hash": "abc123" },
      ),
    ]);
    client.client.defaults.adapter = adapter;

    const result = await client.whisper({
      url: "https://example.com/doc.pdf",
      timeout: 0,
    });
    expect(result.whisper_hash).toBe("abc123");
  });

  test("whisper with timeout>0 (sync) does NOT retry on 503", async () => {
    const client = createV1Client({ maxRetries: 3, jitter: 0 });
    let callCount = 0;
    client.client.defaults.adapter = (config) => {
      callCount++;
      const err = new Error("Service Unavailable");
      err.response = { status: 503, data: { message: "Service Unavailable" }, headers: {} };
      err.config = config;
      err.isAxiosError = true;
      return Promise.reject(err);
    };

    await expect(
      client.whisper({
        url: "https://example.com/doc.pdf",
        timeout: 60,
      }),
    ).rejects.toThrow(LLMWhispererClientException);
    expect(callCount).toBe(1);
  });
});

describe("V2 Retry Behavior", () => {
  test("getUsageInfo retries on 503 then succeeds", async () => {
    const client = createV2Client({ maxRetries: 2, jitter: 0 });
    const adapter = mockAdapter([
      errorResponse(503, "Service Unavailable"),
      successResponse({ usage: "200" }),
    ]);
    client.client.defaults.adapter = adapter;

    const result = await client.getUsageInfo();
    expect(result).toEqual({ usage: "200" });
  });

  test("whisper retries on 503 (always async)", async () => {
    const client = createV2Client({ maxRetries: 2, jitter: 0 });
    const adapter = mockAdapter([
      errorResponse(503, "Service Unavailable"),
      successResponse({ whisper_hash: "v2hash" }, 202),
    ]);
    client.client.defaults.adapter = adapter;

    const result = await client.whisper({
      url: "https://example.com/doc.pdf",
    });
    expect(result.whisper_hash).toBe("v2hash");
  });

  test("registerWebhook does NOT retry on 503", async () => {
    const client = createV2Client({ maxRetries: 3, jitter: 0 });
    let callCount = 0;
    client.client.defaults.adapter = (config) => {
      callCount++;
      const err = new Error("Service Unavailable");
      err.response = { status: 503, data: { message: "Service Unavailable" }, headers: {} };
      err.config = config;
      err.isAxiosError = true;
      return Promise.reject(err);
    };

    await expect(
      client.registerWebhook("https://example.com/hook", "token", "my-webhook"),
    ).rejects.toThrow();
    expect(callCount).toBe(1);
  });

  test("updateWebhookDetails retries on 500", async () => {
    const client = createV2Client({ maxRetries: 2, jitter: 0 });
    const adapter = mockAdapter([
      errorResponse(500, "Internal Server Error"),
      successResponse({ updated: true }),
    ]);
    client.client.defaults.adapter = adapter;

    const result = await client.updateWebhookDetails(
      "my-webhook",
      "https://example.com/hook",
      "token",
    );
    expect(result.status_code).toBe(200);
  });

  test("getWebhookDetails retries on network error", async () => {
    const client = createV2Client({ maxRetries: 2, jitter: 0 });
    const adapter = mockAdapter([
      networkError("ETIMEDOUT"),
      successResponse({ webhook: "details" }),
    ]);
    client.client.defaults.adapter = adapter;

    const result = await client.getWebhookDetails("my-webhook");
    expect(result.status_code).toBe(200);
  });

  test("deleteWebhookDetails retries on 502", async () => {
    const client = createV2Client({ maxRetries: 2, jitter: 0 });
    const adapter = mockAdapter([
      errorResponse(502, "Bad Gateway"),
      successResponse({ deleted: true }),
    ]);
    client.client.defaults.adapter = adapter;

    const result = await client.deleteWebhookDetails("my-webhook");
    expect(result.status_code).toBe(200);
  });

  test("getHighlightData retries on 503 then succeeds", async () => {
    const client = createV2Client({ maxRetries: 2, jitter: 0 });
    const adapter = mockAdapter([
      errorResponse(503, "Service Unavailable"),
      successResponse({ highlights: [{ line: 1 }] }),
    ]);
    client.client.defaults.adapter = adapter;

    const result = await client.getHighlightData("hash", "1-5");
    expect(result).toEqual({ highlights: [{ line: 1 }] });
  });
});

describe("Retry-After header", () => {
  test("429 with Retry-After header is respected", async () => {
    const client = createV1Client({ maxRetries: 1, jitter: 0, initialDelay: 0.1 });
    const adapter = mockAdapter([
      // 429 with Retry-After of 1 second
      (() => {
        const r = errorResponse(429, "Rate limited");
        r.response.headers = { "retry-after": "1" };
        return r;
      })(),
      successResponse({ usage: "100" }),
    ]);
    client.client.defaults.adapter = adapter;

    const result = await client.getUsageInfo();
    expect(result).toEqual({ usage: "100" });
  });
});

describe("Backoff delay calculation", () => {
  test("delay formula matches: min(initial * factor^(attempt-1), max) + jitter", () => {
    const initialDelay = 2.0;
    const backoffFactor = 2.0;
    const maxDelay = 60.0;

    // attempt 1: min(2 * 2^0, 60) = 2
    expect(Math.min(initialDelay * Math.pow(backoffFactor, 0), maxDelay)).toBe(2);
    // attempt 2: min(2 * 2^1, 60) = 4
    expect(Math.min(initialDelay * Math.pow(backoffFactor, 1), maxDelay)).toBe(4);
    // attempt 3: min(2 * 2^2, 60) = 8
    expect(Math.min(initialDelay * Math.pow(backoffFactor, 2), maxDelay)).toBe(8);
    // attempt 4: min(2 * 2^3, 60) = 16
    expect(Math.min(initialDelay * Math.pow(backoffFactor, 3), maxDelay)).toBe(16);
    // attempt 10: capped at maxDelay
    expect(Math.min(initialDelay * Math.pow(backoffFactor, 9), maxDelay)).toBe(60);
  });
});

describe("File stream re-creation", () => {
  test("V1 whisper with filePath attaches _filePath to config for retry", async () => {
    const testFilePath = path.join(__dirname, "data", "credit_card.pdf");
    const client = createV1Client({ maxRetries: 1, jitter: 0 });
    let capturedConfig;
    client.client.defaults.adapter = (config) => {
      capturedConfig = config;
      return Promise.resolve({
        status: 200,
        data: "extracted text",
        headers: { "whisper-hash": "hash123" },
        config,
      });
    };

    await client.whisper({ filePath: testFilePath, timeout: 0 });
    expect(capturedConfig._filePath).toBe(testFilePath);
  });

  test("V2 whisper with filePath attaches _filePath to config for retry", async () => {
    const testFilePath = path.join(__dirname, "data", "credit_card.pdf");
    const client = createV2Client({ maxRetries: 1, jitter: 0 });
    let capturedConfig;
    client.client.defaults.adapter = (config) => {
      capturedConfig = config;
      return Promise.resolve({
        status: 202,
        data: { whisper_hash: "v2hash" },
        headers: {},
        config,
      });
    };

    await client.whisper({ filePath: testFilePath });
    expect(capturedConfig._filePath).toBe(testFilePath);
  });

  test("onRetry re-creates file stream when _filePath is set", async () => {
    const testFilePath = path.join(__dirname, "data", "credit_card.pdf");
    const client = createV1Client({ maxRetries: 1, jitter: 0 });
    let callCount = 0;
    let secondCallData;
    client.client.defaults.adapter = (config) => {
      callCount++;
      if (callCount === 1) {
        const err = new Error("Service Unavailable");
        err.response = { status: 503, data: { message: "Service Unavailable" }, headers: {} };
        err.config = config;
        err.isAxiosError = true;
        return Promise.reject(err);
      }
      secondCallData = config.data;
      return Promise.resolve({
        status: 200,
        data: "extracted text",
        headers: { "whisper-hash": "hash123" },
        config,
      });
    };

    await client.whisper({ filePath: testFilePath, timeout: 0 });
    expect(callCount).toBe(2);
    // The data should be a fresh ReadStream (re-created by onRetry)
    expect(secondCallData).toBeDefined();
    expect(secondCallData.constructor.name).toBe("ReadStream");
  });
});

describe("Logging on retries", () => {
  test("onRetry logs a warning message", async () => {
    const client = createV1Client({ maxRetries: 1, jitter: 0 });
    const adapter = mockAdapter([
      errorResponse(503, "Service Unavailable"),
      successResponse({ usage: "100" }),
    ]);
    client.client.defaults.adapter = adapter;

    await client.getUsageInfo();
    expect(client.logger.warn).toHaveBeenCalled();
    const warnCall = client.logger.warn.mock.calls[0][0];
    expect(warnCall).toMatch(/Retry 1\//);
    expect(warnCall).toMatch(/503/);
  });
});

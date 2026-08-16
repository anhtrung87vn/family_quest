/**
 * DEV ONLY: patches the undici global dispatcher to disable TLS certificate
 * verification. This allows the app to connect through corporate TLS-inspecting
 * proxies that cause ECONNRESET in Node 18+ native fetch (undici-based).
 *
 * Import this module at the top of any server action file that makes outbound
 * requests in development.
 *
 * Safe: .env.local is gitignored, NODE_ENV check ensures this never runs in prod.
 */
if (process.env.NODE_ENV !== "production") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { setGlobalDispatcher, Agent, fetch: undiciFetch } = require("undici") as typeof import("undici");
  const insecureAgent = new Agent({ connect: { rejectUnauthorized: false } });
  setGlobalDispatcher(insecureAgent);
  // Also override globalThis.fetch so any code path that calls fetch() directly uses the insecure agent
  (globalThis as unknown as Record<string, unknown>).fetch = (
    input: Parameters<typeof undiciFetch>[0],
    init?: Parameters<typeof undiciFetch>[1],
  ) => undiciFetch(input, { ...init, dispatcher: insecureAgent });
}

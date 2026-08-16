export async function register() {
  if (process.env.NODE_ENV !== "production" && process.env.NEXT_RUNTIME === "nodejs") {
    const { setGlobalDispatcher, Agent, fetch: undiciFetch } = await import("undici");
    const insecureAgent = new Agent({ connect: { rejectUnauthorized: false } });
    setGlobalDispatcher(insecureAgent);
    (globalThis as unknown as Record<string, unknown>).fetch = (
      input: Parameters<typeof undiciFetch>[0],
      init?: Parameters<typeof undiciFetch>[1],
    ) => undiciFetch(input, { ...init, dispatcher: insecureAgent });
    console.log("[instrumentation] undici global dispatcher + globalThis.fetch patched — TLS verification disabled for dev");
  }
}

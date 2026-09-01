import { PulseWorkbenchClient } from "@mobile-pulse/api-client";

export const API_BASE_URL =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE_URL ||
  (typeof window !== "undefined" ? window.localStorage.getItem("mp_api_base_url") || "" : "");

export const ADMIN_TOKEN =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_ADMIN_TOKEN ||
  (typeof window !== "undefined" ? window.localStorage.getItem("mp_admin_token") || "" : "");

export const createWorkbenchClient = (baseUrl = API_BASE_URL, apiToken = ADMIN_TOKEN) => {
  return new PulseWorkbenchClient({
    baseUrl,
    apiToken: apiToken || undefined,
  });
};

export const defaultClient = createWorkbenchClient();

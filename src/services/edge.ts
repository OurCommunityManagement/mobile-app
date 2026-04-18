import { env } from "../config/env";
import { getStoredSession } from "./sessionStorage";

type JsonValue = Record<string, unknown>;

async function edgeRequest<T>(
  name: string,
  payload: unknown,
  extraHeaders?: Record<string, string>
): Promise<T> {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error("Missing Supabase configuration.");
  }

  const response = await fetch(`${env.supabaseUrl}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: env.supabaseAnonKey,
      Authorization: `Bearer ${env.supabaseAnonKey}`,
      ...(extraHeaders ?? {})
    },
    body: JSON.stringify(payload ?? {})
  });

  let data: JsonValue = {};
  try {
    data = (await response.json()) as JsonValue;
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error((data.error as string) || `${name} failed with status ${response.status}`);
  }

  return data as T;
}

export async function callEdgeFunction<T>(name: string, payload?: unknown) {
  return edgeRequest<T>(name, payload);
}

export async function callCommunityProtectedEdgeFunction<T>(name: string, payload?: unknown) {
  const session = await getStoredSession();
  if (!session?.sessionToken) {
    throw new Error("Your community session has expired. Please sign in again.");
  }
  return edgeRequest<T>(name, payload, {
    "x-community-session": session.sessionToken
  });
}

export async function callPlatformProtectedEdgeFunction<T>(name: string, payload?: unknown) {
  const session = await getStoredSession();
  if (!session?.sessionToken) {
    throw new Error("Your platform session has expired. Please sign in again.");
  }
  return edgeRequest<T>(name, payload, {
    "x-platform-session": session.sessionToken
  });
}

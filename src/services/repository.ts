import { supabase } from "./supabase";
import {
  callCommunityProtectedEdgeFunction,
  callEdgeFunction,
  callPlatformProtectedEdgeFunction
} from "./edge";
import { getStoredSession } from "./sessionStorage";
import type { Community, CommunityData, OtpStore, PlatformAdmin } from "../types/models";

type PlatformMap = {
  admin: PlatformAdmin | null;
  communities: Community[];
  otp_store: OtpStore | null;
};

const defaultCommunityData: CommunityData = {
  admin: null,
  staffList: [],
  owners: [],
  invoices: [],
  payments: [],
  expenseHeads: [],
  expenses: [],
  amenities: [],
  amenityBookings: [],
  visitors: [],
  vehicles: [],
  gateLogs: []
};

function ensureClient() {
  if (!supabase) {
    throw new Error("Missing Supabase configuration. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.");
  }
  return supabase;
}

export async function loadPlatformData(): Promise<PlatformMap> {
  try {
    const session = await getStoredSession();
    const bootstrap = session?.sessionToken && session.role === "platform"
      ? await callPlatformProtectedEdgeFunction<{
          communities?: Community[];
          admin?: PlatformAdmin | null;
        }>("platform-bootstrap")
      : await callEdgeFunction<{
          communities?: Community[];
          admin?: PlatformAdmin | null;
        }>("platform-bootstrap");

    return {
      admin: bootstrap.admin ?? null,
      communities: bootstrap.communities ?? [],
      otp_store: null
    };
  } catch {
    // Fall back to direct table reads in legacy/local setups.
  }

  const client = ensureClient();
  const { data, error } = await client.from("platform_kv").select("key, value");
  if (error) {
    throw new Error(error.message);
  }

  const map: PlatformMap = { admin: null, communities: [], otp_store: null };
  for (const row of data ?? []) {
    if (row.key === "admin") map.admin = row.value as PlatformAdmin;
    if (row.key === "communities") map.communities = (row.value as Community[]) ?? [];
    if (row.key === "otp_store") map.otp_store = row.value as OtpStore;
  }

  return map;
}

export async function upsertPlatformValue(key: string, value: unknown) {
  const client = ensureClient();
  const { error } = await client.from("platform_kv").upsert({ key, value });
  if (error) {
    throw new Error(error.message);
  }
}

export async function loadCommunityData(communityId: string): Promise<CommunityData> {
  const session = await getStoredSession();
  if (session?.sessionToken && session.cid === communityId && session.role === "admin" && session.fromPlatform) {
    const bootstrap = await callPlatformProtectedEdgeFunction<{
      rows?: Array<{ key: string; value: unknown }>;
    }>("community-bootstrap", { communityId });

    const result: CommunityData = { ...defaultCommunityData };
    for (const row of bootstrap.rows ?? []) {
      if (row.key === "admin") result.admin = row.value as PlatformAdmin;
      if (row.key === "staffList") result.staffList = (row.value as CommunityData["staffList"]) ?? [];
      if (row.key === "owners") result.owners = (row.value as CommunityData["owners"]) ?? [];
      if (row.key === "invoices") result.invoices = (row.value as CommunityData["invoices"]) ?? [];
      if (row.key === "payments") result.payments = (row.value as CommunityData["payments"]) ?? [];
      if (row.key === "expenseHeads") result.expenseHeads = (row.value as CommunityData["expenseHeads"]) ?? [];
      if (row.key === "expenses") result.expenses = (row.value as CommunityData["expenses"]) ?? [];
      if (row.key === "amenities") result.amenities = (row.value as CommunityData["amenities"]) ?? [];
      if (row.key === "amenityBookings") result.amenityBookings = (row.value as CommunityData["amenityBookings"]) ?? [];
      if (row.key === "visitors") result.visitors = (row.value as CommunityData["visitors"]) ?? [];
      if (row.key === "vehicles") result.vehicles = (row.value as CommunityData["vehicles"]) ?? [];
      if (row.key === "gateLogs") result.gateLogs = (row.value as CommunityData["gateLogs"]) ?? [];
    }
    return result;
  }

  if (session?.sessionToken && session.cid === communityId && (session.role === "admin" || session.role === "user")) {
    const bootstrap = await callCommunityProtectedEdgeFunction<{
      rows?: Array<{ key: string; value: unknown }>;
    }>("community-bootstrap", { communityId });

    const result: CommunityData = { ...defaultCommunityData };
    for (const row of bootstrap.rows ?? []) {
      if (row.key === "admin") result.admin = row.value as PlatformAdmin;
      if (row.key === "staffList") result.staffList = (row.value as CommunityData["staffList"]) ?? [];
      if (row.key === "owners") result.owners = (row.value as CommunityData["owners"]) ?? [];
      if (row.key === "invoices") result.invoices = (row.value as CommunityData["invoices"]) ?? [];
      if (row.key === "payments") result.payments = (row.value as CommunityData["payments"]) ?? [];
      if (row.key === "expenseHeads") result.expenseHeads = (row.value as CommunityData["expenseHeads"]) ?? [];
      if (row.key === "expenses") result.expenses = (row.value as CommunityData["expenses"]) ?? [];
      if (row.key === "amenities") result.amenities = (row.value as CommunityData["amenities"]) ?? [];
      if (row.key === "amenityBookings") result.amenityBookings = (row.value as CommunityData["amenityBookings"]) ?? [];
      if (row.key === "visitors") result.visitors = (row.value as CommunityData["visitors"]) ?? [];
      if (row.key === "vehicles") result.vehicles = (row.value as CommunityData["vehicles"]) ?? [];
      if (row.key === "gateLogs") result.gateLogs = (row.value as CommunityData["gateLogs"]) ?? [];
    }
    return result;
  }

  const client = ensureClient();
  const { data, error } = await client
    .from("community_kv")
    .select("key, value")
    .eq("community_id", communityId);

  if (error) {
    throw new Error(error.message);
  }

  const result: CommunityData = { ...defaultCommunityData };
  for (const row of data ?? []) {
    if (row.key === "admin") result.admin = row.value as PlatformAdmin;
    if (row.key === "staffList") result.staffList = (row.value as CommunityData["staffList"]) ?? [];
    if (row.key === "owners") result.owners = (row.value as CommunityData["owners"]) ?? [];
    if (row.key === "invoices") result.invoices = (row.value as CommunityData["invoices"]) ?? [];
    if (row.key === "payments") result.payments = (row.value as CommunityData["payments"]) ?? [];
    if (row.key === "expenseHeads") result.expenseHeads = (row.value as CommunityData["expenseHeads"]) ?? [];
    if (row.key === "expenses") result.expenses = (row.value as CommunityData["expenses"]) ?? [];
    if (row.key === "amenities") result.amenities = (row.value as CommunityData["amenities"]) ?? [];
    if (row.key === "amenityBookings") result.amenityBookings = (row.value as CommunityData["amenityBookings"]) ?? [];
    if (row.key === "visitors") result.visitors = (row.value as CommunityData["visitors"]) ?? [];
    if (row.key === "vehicles") result.vehicles = (row.value as CommunityData["vehicles"]) ?? [];
    if (row.key === "gateLogs") result.gateLogs = (row.value as CommunityData["gateLogs"]) ?? [];
  }

  return result;
}

export async function upsertCommunityValue(communityId: string, key: string, value: unknown) {
  const session = await getStoredSession();
  if (session?.sessionToken && session.cid === communityId && session.role === "admin" && session.fromPlatform) {
    await callPlatformProtectedEdgeFunction("community-kv-write", {
      communityId,
      operation: "upsert",
      key,
      value
    });
    return;
  }

  if (session?.sessionToken && session.cid === communityId && (session.role === "admin" || session.role === "user")) {
    await callCommunityProtectedEdgeFunction("community-kv-write", {
      communityId,
      operation: "upsert",
      key,
      value
    });
    return;
  }

  const client = ensureClient();
  const { error } = await client.from("community_kv").upsert({
    community_id: communityId,
    key,
    value
  });
  if (error) {
    throw new Error(error.message);
  }
}

import { upsertCommunityValue, upsertPlatformValue } from "./repository";
import { sha256 } from "./hash";
import type { CommunityData, PlatformAdmin } from "../types/models";

export async function ensurePlatformSeed(
  platformAdmin: PlatformAdmin | null,
  communities: unknown[] | null | undefined
) {
  if (!platformAdmin) {
    const password = await sha256("Platform@123");
    await upsertPlatformValue("admin", {
      email: "platform@cms.com",
      password
    });
  }

  if (!communities || communities.length === 0) {
    await upsertPlatformValue("communities", []);
  }
}

export async function ensureCommunitySeed(
  communityId: string,
  adminEmail: string,
  communityData: CommunityData | null | undefined
) {
  if (!communityData?.admin) {
    const password = await sha256("Admin@123");
    await upsertCommunityValue(communityId, "admin", {
      email: adminEmail.toLowerCase(),
      password
    });
  }

  if (!communityData?.staffList) {
    await upsertCommunityValue(communityId, "staffList", []);
  }

  if (!communityData?.amenities) {
    await upsertCommunityValue(communityId, "amenities", []);
  }

  if (!communityData?.amenityBookings) {
    await upsertCommunityValue(communityId, "amenityBookings", []);
  }

  if (!communityData?.visitors) {
    await upsertCommunityValue(communityId, "visitors", []);
  }

  if (!communityData?.vehicles) {
    await upsertCommunityValue(communityId, "vehicles", []);
  }

  if (!communityData?.gateLogs) {
    await upsertCommunityValue(communityId, "gateLogs", []);
  }
}

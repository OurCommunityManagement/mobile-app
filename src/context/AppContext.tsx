import { createContext, PropsWithChildren, useContext, useEffect, useState } from "react";
import {
  loadCommunityData,
  loadPlatformData,
  upsertCommunityValue,
  upsertPlatformValue
} from "../services/repository";
import { clearStoredSession, getStoredSession, setStoredSession } from "../services/sessionStorage";
import { callEdgeFunction, callPlatformProtectedEdgeFunction } from "../services/edge";
import { generateId, generateOtp, matchesPassword, sha256 } from "../services/hash";
import { generateTotpSecret } from "../services/totp";
import { env } from "../config/env";
import { ensureCommunitySeed, ensurePlatformSeed } from "../services/bootstrap";
import type {
  AdminInvoiceInput,
  AdminOwnerInput,
  AmenityInput,
  Community,
  CommunityData,
  ExpenseHeadInput,
  ExpenseInput,
  GateEntryInput,
  OtpStore,
  PendingCommunityAuth,
  PendingPlatformAuth,
  OwnerPaymentInput,
  OwnerProfileInput,
  PlatformCommunityInput,
  Session,
  StaffInput,
  VehicleInput,
  VisitorInput
} from "../types/models";

type LoginResult = { ok: true } | { ok: false; message: string };

type AppContextValue = {
  booting: boolean;
  refreshing: boolean;
  configured: boolean;
  session: Session | null;
  platformAdminEmail: string | null;
  communities: Community[];
  activeCommunity: Community | null;
  communityData: CommunityData | null;
  otpStore: OtpStore | null;
  pendingPlatformAuth: PendingPlatformAuth | null;
  pendingCommunityAuth: PendingCommunityAuth | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  verifyPlatformTotp: (code: string) => Promise<LoginResult>;
  cancelPlatformTotp: () => void;
  verifyCommunityTotp: (code: string) => Promise<LoginResult>;
  cancelCommunityTotp: () => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  createCommunity: (input: PlatformCommunityInput) => Promise<LoginResult>;
  enterCommunity: (community: Community) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<LoginResult & { otp?: string }>;
  resetPassword: (otp: string, nextPassword: string, confirmPassword: string) => Promise<LoginResult>;
  createOwner: (input: AdminOwnerInput) => Promise<LoginResult>;
  createInvoice: (input: AdminInvoiceInput) => Promise<LoginResult>;
  saveStaffMember: (input: StaffInput) => Promise<LoginResult>;
  deleteStaffMember: (staffId: string) => Promise<LoginResult>;
  createExpenseHead: (input: ExpenseHeadInput) => Promise<LoginResult>;
  createExpense: (input: ExpenseInput) => Promise<LoginResult>;
  saveAmenity: (input: AmenityInput) => Promise<LoginResult>;
  deleteAmenity: (amenityId: string) => Promise<LoginResult>;
  updateVisitorStatus: (visitorId: string, status: string) => Promise<LoginResult>;
  saveVehicle: (input: VehicleInput) => Promise<LoginResult>;
  deleteVehicle: (vehicleId: string) => Promise<LoginResult>;
  logGateEntry: (input: GateEntryInput) => Promise<LoginResult>;
  logGateExit: (vehicleNumber: string) => Promise<LoginResult>;
  updateOwnerProfile: (input: OwnerProfileInput) => Promise<LoginResult>;
  changeOwnerPassword: (currentPassword: string, nextPassword: string, confirmPassword: string) => Promise<LoginResult>;
  payOwnerInvoice: (input: OwnerPaymentInput) => Promise<LoginResult>;
  bookAmenity: (amenityId: string, slotId: string, date: string) => Promise<LoginResult>;
  cancelAmenityBooking: (bookingId: string) => Promise<LoginResult>;
  registerVisitor: (input: VisitorInput) => Promise<LoginResult & { passCode?: string }>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const [booting, setBooting] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [platformAdminEmail, setPlatformAdminEmail] = useState<string | null>(null);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [activeCommunity, setActiveCommunity] = useState<Community | null>(null);
  const [communityData, setCommunityData] = useState<CommunityData | null>(null);
  const [otpStore, setOtpStore] = useState<OtpStore | null>(null);
  const [pendingPlatformAuth, setPendingPlatformAuth] = useState<PendingPlatformAuth | null>(null);
  const [pendingCommunityAuth, setPendingCommunityAuth] = useState<PendingCommunityAuth | null>(null);

  async function loadBootState(nextSession?: Session | null) {
    const initialPlatform = await loadPlatformData();
    try {
      await ensurePlatformSeed(initialPlatform.admin, initialPlatform.communities);
    } catch {
      // Protected backends may disable direct seed writes; skip quietly in that mode.
    }
    const platform = await loadPlatformData();
    setPlatformAdminEmail(platform.admin?.email ?? null);
    setCommunities(platform.communities ?? []);
    setOtpStore(platform.otp_store ?? null);

    const currentSession = nextSession ?? (await getStoredSession());
    setSession(currentSession);

    if (currentSession?.cid) {
      const community = (platform.communities ?? []).find((item) => item.id === currentSession.cid) ?? null;
      setActiveCommunity(community);
      if (community) {
        const data = await loadCommunityData(community.id);
        if (!currentSession.sessionToken) {
          try {
            await ensureCommunitySeed(community.id, community.adminEmail, data);
          } catch {
            // Protected backends may disable direct seed writes; skip quietly in that mode.
          }
          setCommunityData(await loadCommunityData(community.id));
        } else {
          setCommunityData(data);
        }
      } else {
        setCommunityData(null);
      }
    } else {
      setActiveCommunity(null);
      setCommunityData(null);
    }
  }

  async function refresh() {
    setRefreshing(true);
    try {
      await loadBootState(session);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    async function boot() {
      try {
        if (env.hasSupabaseConfig) {
          await loadBootState();
        }
      } finally {
        setBooting(false);
      }
    }
    void boot();
  }, []);

  async function login(email: string, password: string): Promise<LoginResult> {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      type PlatformLoginResponse = {
        ok?: boolean;
        error?: string;
        accountType?: "admin" | "staff";
        account?: {
          email: string;
          name?: string;
          platformRole?: string;
          scope?: string;
          requiresTotp?: boolean;
          totpSetupRequired?: boolean;
        };
      };

      const platformLogin: PlatformLoginResponse = await callEdgeFunction<PlatformLoginResponse>("platform-auth-login", {
        email: normalizedEmail,
        password
      }).catch((error: Error) => ({ ok: false, error: error.message }));

      if (platformLogin.ok && platformLogin.account && platformLogin.accountType) {
        setPendingCommunityAuth(null);
        setPendingPlatformAuth({
          email: normalizedEmail,
          accountType: platformLogin.accountType,
          name: platformLogin.account.name || "Platform Admin",
          platformRole: platformLogin.account.platformRole,
          scope: platformLogin.account.scope,
          requiresTotp: !!platformLogin.account.requiresTotp,
          totpSetupRequired: !!platformLogin.account.totpSetupRequired,
          setupSecret: platformLogin.account.totpSetupRequired ? generateTotpSecret() : undefined
        });
        return { ok: true };
      }

      const platform = await loadPlatformData();

      for (const community of platform.communities ?? []) {
        const result: {
          ok?: boolean;
          error?: string;
          requiresTotp?: boolean;
          totpSetupRequired?: boolean;
          account?: {
            communityId: string;
            email: string;
            role: "admin" | "user";
            staffId?: string | null;
            staffName?: string;
            staffRole?: string;
            mustChangePassword?: boolean;
            requiresTotp?: boolean;
            totpSetupRequired?: boolean;
          };
          session?: {
            communityId: string;
            email: string;
            role: "admin" | "user";
            sessionToken: string;
            expiresAt?: string;
            staffName?: string;
            staffRole?: string;
          };
        } = await callEdgeFunction<{
          ok?: boolean;
          error?: string;
          requiresTotp?: boolean;
          totpSetupRequired?: boolean;
          account?: {
            communityId: string;
            email: string;
            role: "admin" | "user";
            staffId?: string | null;
            staffName?: string;
            staffRole?: string;
            mustChangePassword?: boolean;
            requiresTotp?: boolean;
            totpSetupRequired?: boolean;
          };
          session?: {
            communityId: string;
            email: string;
            role: "admin" | "user";
            sessionToken: string;
            expiresAt?: string;
            staffName?: string;
            staffRole?: string;
          };
        }>("community-auth-login", {
          communityId: community.id,
          email: normalizedEmail,
          password
        }).catch((error: Error) => ({ ok: false, error: error.message, session: undefined }));

        if (!result.ok || !result.session) {
          if (result.ok && result.account?.role === "admin" && (result.requiresTotp || result.totpSetupRequired)) {
            setPendingPlatformAuth(null);
            setPendingCommunityAuth({
              communityId: community.id,
              email: normalizedEmail,
              accountType: result.account.staffId ? "staff" : "admin",
              name: result.account.staffName || "Admin",
              staffRole: result.account.staffRole || "superadmin",
              totpSetupRequired: !!result.totpSetupRequired,
              setupSecret: result.totpSetupRequired ? generateTotpSecret() : undefined
            });
            return { ok: true };
          }
          continue;
        }

        if (result.session.role === "admin") {
          setPendingPlatformAuth(null);
          setPendingCommunityAuth(null);
          const nextSession: Session = {
            role: "admin",
            email: normalizedEmail,
            cid: community.id,
            staffName: result.session.staffName || "Admin",
            staffRole: result.session.staffRole || "superadmin",
            sessionToken: result.session.sessionToken,
            expiresAt: result.session.expiresAt
          };
          await setStoredSession(nextSession);
          await loadBootState(nextSession);
          return { ok: true };
        }

        if (result.session.role === "user") {
          setPendingPlatformAuth(null);
          setPendingCommunityAuth(null);
          const nextSession: Session = {
            role: "user",
            email: normalizedEmail,
            cid: community.id,
            sessionToken: result.session.sessionToken,
            expiresAt: result.session.expiresAt
          };
          await setStoredSession(nextSession);
          await loadBootState(nextSession);
          return { ok: true };
        }
      }

      return { ok: false, message: "Invalid email or password." };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to sign in right now."
      };
    }
  }

  async function verifyPlatformTotp(code: string): Promise<LoginResult> {
    try {
      if (!pendingPlatformAuth) {
        return { ok: false, message: "No platform sign-in is waiting for verification." };
      }

      const result = await callEdgeFunction<{
        ok?: boolean;
        error?: string;
        session?: {
          email: string;
          role: "platform_admin" | "platform_staff";
          platformRole?: string;
          scope?: string;
          sessionToken: string;
          expiresAt?: string;
          mustChangePassword?: boolean;
        };
      }>("platform-auth-verify-totp", {
        email: pendingPlatformAuth.email,
        accountType: pendingPlatformAuth.accountType,
        setupSecret: pendingPlatformAuth.totpSetupRequired ? pendingPlatformAuth.setupSecret : null,
        code
      });

      if (!result.ok || !result.session?.sessionToken) {
        return { ok: false, message: result.error || "Unable to verify authenticator code." };
      }

      const nextSession: Session = {
        role: "platform",
        email: result.session.email,
        staffName: pendingPlatformAuth.name,
        staffRole: result.session.platformRole || pendingPlatformAuth.platformRole,
        sessionToken: result.session.sessionToken,
        expiresAt: result.session.expiresAt
      };

      setPendingPlatformAuth(null);
      await setStoredSession(nextSession);
      await loadBootState(nextSession);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to verify authenticator code."
      };
    }
  }

  function cancelPlatformTotp() {
    setPendingPlatformAuth(null);
  }

  async function verifyCommunityTotp(code: string): Promise<LoginResult> {
    try {
      if (!pendingCommunityAuth) {
        return { ok: false, message: "No community sign-in is waiting for verification." };
      }

      const result = await callEdgeFunction<{
        ok?: boolean;
        error?: string;
        session?: {
          communityId: string;
          email: string;
          role: "admin";
          sessionToken: string;
          expiresAt?: string;
          staffName?: string;
          staffRole?: string;
        };
      }>("community-auth-verify-totp", {
        communityId: pendingCommunityAuth.communityId,
        email: pendingCommunityAuth.email,
        accountType: pendingCommunityAuth.accountType,
        setupSecret: pendingCommunityAuth.totpSetupRequired ? pendingCommunityAuth.setupSecret : null,
        code
      });

      if (!result.ok || !result.session?.sessionToken) {
        return { ok: false, message: result.error || "Unable to verify authenticator code." };
      }

      const nextSession: Session = {
        role: "admin",
        email: result.session.email,
        cid: pendingCommunityAuth.communityId,
        staffName: result.session.staffName || pendingCommunityAuth.name,
        staffRole: result.session.staffRole || pendingCommunityAuth.staffRole || "superadmin",
        sessionToken: result.session.sessionToken,
        expiresAt: result.session.expiresAt
      };

      setPendingCommunityAuth(null);
      await setStoredSession(nextSession);
      await loadBootState(nextSession);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to verify authenticator code."
      };
    }
  }

  function cancelCommunityTotp() {
    setPendingCommunityAuth(null);
  }

  async function logout() {
    await clearStoredSession();
    setPendingPlatformAuth(null);
    setPendingCommunityAuth(null);
    setSession(null);
    setActiveCommunity(null);
    setCommunityData(null);
    await loadBootState(null);
  }

  async function createCommunity(input: PlatformCommunityInput): Promise<LoginResult> {
    try {
      if (session?.role !== "platform") {
        return { ok: false, message: "Platform session not found." };
      }

      const platform = await loadPlatformData();
      const name = input.name.trim();
      const slug = input.slug.trim().toLowerCase();
      const adminEmail = input.adminEmail.trim().toLowerCase();
      if (!name || !slug || !adminEmail) {
        return { ok: false, message: "Name, slug, and admin email are required." };
      }

      const slugTaken = (platform.communities ?? []).some((community) => community.slug.toLowerCase() === slug);
      if (slugTaken) {
        return { ok: false, message: "A community with this slug already exists." };
      }

      const result = await callPlatformProtectedEdgeFunction<{
        ok?: boolean;
        error?: string;
        communityId?: string;
      }>("platform-admin-write", {
        action: "upsert_community",
        payload: {
          community: {
            name,
            slug,
            address: input.address?.trim() || "",
            adminEmail
          }
        }
      });

      if (!result.ok) {
        return { ok: false, message: result.error || "Unable to create community." };
      }

      await refresh();
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Unable to create community." };
    }
  }

  async function enterCommunity(community: Community) {
    if (!session?.sessionToken || session.role !== "platform") {
      throw new Error("Platform session not found.");
    }
    const nextSession: Session = {
      role: "admin",
      email: session.email,
      cid: community.id,
      staffName: session.staffName || "Platform Admin",
      staffRole: session.staffRole || "superadmin",
      fromPlatform: true,
      sessionToken: session.sessionToken,
      expiresAt: session.expiresAt
    };
    await setStoredSession(nextSession);
    await loadBootState(nextSession);
  }

  function requireAdminSession() {
    if (!session?.cid || session.role !== "admin") {
      throw new Error("Admin session not found.");
    }
    return { communityId: session.cid };
  }

  function requireOwnerSession() {
    if (!session?.cid || session.role !== "user") {
      throw new Error("Owner session not found.");
    }
    return { communityId: session.cid, email: session.email.toLowerCase() };
  }

  async function persistCommunity<K extends keyof CommunityData>(
    communityId: string,
    data: CommunityData,
    key: K,
    value: CommunityData[K]
  ) {
    await upsertCommunityValue(communityId, key, value);
    setCommunityData({ ...data, [key]: value });
  }

  async function createOwner(input: AdminOwnerInput): Promise<LoginResult> {
    try {
      const { communityId } = requireAdminSession();
      const data = communityData ?? (await loadCommunityData(communityId));
      const normalizedEmail = input.email.trim().toLowerCase();
      if (!input.name.trim() || !normalizedEmail || !input.temporaryPassword.trim()) {
        return { ok: false, message: "Name, email, and temporary password are required." };
      }
      if (input.temporaryPassword.trim().length < 8) {
        return { ok: false, message: "Temporary password must be at least 8 characters." };
      }
      const exists = data.owners.some((owner) => owner.email.toLowerCase() === normalizedEmail);
      if (exists) {
        return { ok: false, message: "An owner with this email already exists." };
      }

      const password = await sha256(input.temporaryPassword.trim());
      const nextOwners = [
        ...data.owners,
        {
          id: generateId("own"),
          name: input.name.trim(),
          email: normalizedEmail,
          mobile: input.mobile?.trim() || "",
          password,
          unitNo: input.unitNo?.trim() || "",
          cross: input.cross?.trim() || "",
          status: "active",
          createdAt: Date.now()
        }
      ];

      await upsertCommunityValue(communityId, "owners", nextOwners);
      setCommunityData({ ...data, owners: nextOwners });
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Unable to create owner." };
    }
  }

  async function createInvoice(input: AdminInvoiceInput): Promise<LoginResult> {
    try {
      const { communityId } = requireAdminSession();
      const data = communityData ?? (await loadCommunityData(communityId));
      if (!input.ownerId) {
        return { ok: false, message: "Please select an owner." };
      }
      if (!Number.isFinite(input.amount) || input.amount <= 0) {
        return { ok: false, message: "Invoice amount must be greater than zero." };
      }
      if (!Number.isFinite(input.month) || input.month < 1 || input.month > 12) {
        return { ok: false, message: "Month must be between 1 and 12." };
      }
      if (!Number.isFinite(input.year) || input.year < 2020) {
        return { ok: false, message: "Please enter a valid year." };
      }
      const owner = data.owners.find((item) => item.id === input.ownerId);
      if (!owner) {
        return { ok: false, message: "Selected owner was not found." };
      }

      const nextInvoices = [
        ...data.invoices,
        {
          id: generateId("inv"),
          ownerId: input.ownerId,
          amount: input.amount,
          penalty: input.penalty || 0,
          paidAmount: 0,
          status: "pending" as const,
          month: input.month,
          year: input.year,
          dueDate: input.dueDate?.trim() || "",
          freq: input.freq || "monthly",
          type: "flat"
        }
      ];

      await upsertCommunityValue(communityId, "invoices", nextInvoices);
      setCommunityData({ ...data, invoices: nextInvoices });
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Unable to create invoice." };
    }
  }

  async function saveStaffMember(input: StaffInput): Promise<LoginResult> {
    try {
      const { communityId } = requireAdminSession();
      const data = communityData ?? (await loadCommunityData(communityId));
      const normalizedEmail = input.email.trim().toLowerCase();
      if (!input.name.trim() || !normalizedEmail || !input.role.trim()) {
        return { ok: false, message: "Name, email, and role are required." };
      }

      const duplicateAdmin = data.admin?.email.toLowerCase() === normalizedEmail;
      const duplicateStaff = data.staffList.some(
        (staff) => staff.email.toLowerCase() === normalizedEmail && staff.id !== input.id
      );
      if (duplicateAdmin || duplicateStaff) {
        return { ok: false, message: "This email is already in use." };
      }

      if (!input.id && (!input.password || input.password.trim().length < 8)) {
        return { ok: false, message: "Password must be at least 8 characters." };
      }
      if (input.password && input.password.trim().length > 0 && input.password.trim().length < 8) {
        return { ok: false, message: "Password must be at least 8 characters." };
      }

      const password = input.password?.trim() ? await sha256(input.password.trim()) : null;
      const nextStaffList = input.id
        ? data.staffList.map((staff) =>
            staff.id === input.id
              ? {
                  ...staff,
                  name: input.name.trim(),
                  email: normalizedEmail,
                  role: input.role.trim(),
                  active: input.active,
                  ...(password ? { password } : {})
                }
              : staff
          )
        : [
            ...data.staffList,
            {
              id: generateId("st"),
              name: input.name.trim(),
              email: normalizedEmail,
              role: input.role.trim(),
              password: password!,
              active: input.active,
              createdAt: Date.now()
            }
          ];

      await persistCommunity(communityId, data, "staffList", nextStaffList);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Unable to save staff member." };
    }
  }

  async function deleteStaffMember(staffId: string): Promise<LoginResult> {
    try {
      const { communityId } = requireAdminSession();
      const data = communityData ?? (await loadCommunityData(communityId));
      const target = data.staffList.find((staff) => staff.id === staffId);
      if (!target) {
        return { ok: false, message: "Staff member not found." };
      }
      if (target.email.toLowerCase() === session?.email.toLowerCase()) {
        return { ok: false, message: "You cannot delete your own account." };
      }

      const nextStaffList = data.staffList.filter((staff) => staff.id !== staffId);
      await persistCommunity(communityId, data, "staffList", nextStaffList);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Unable to delete staff member." };
    }
  }

  async function createExpenseHead(input: ExpenseHeadInput): Promise<LoginResult> {
    try {
      const { communityId } = requireAdminSession();
      const data = communityData ?? (await loadCommunityData(communityId));
      const name = input.name.trim();
      if (!name) {
        return { ok: false, message: "Expense head name is required." };
      }
      const duplicate = data.expenseHeads.some((head) => head.name.toLowerCase() === name.toLowerCase());
      if (duplicate) {
        return { ok: false, message: "This expense head already exists." };
      }

      const nextExpenseHeads = [
        ...data.expenseHeads,
        {
          id: generateId("exh"),
          name,
          budget: input.budget || 0,
          createdAt: Date.now()
        }
      ];
      await persistCommunity(communityId, data, "expenseHeads", nextExpenseHeads);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Unable to create expense head." };
    }
  }

  async function createExpense(input: ExpenseInput): Promise<LoginResult> {
    try {
      const { communityId } = requireAdminSession();
      const data = communityData ?? (await loadCommunityData(communityId));
      if (!input.headId) {
        return { ok: false, message: "Please select an expense head." };
      }
      if (!Number.isFinite(input.amount) || input.amount <= 0) {
        return { ok: false, message: "Expense amount must be greater than zero." };
      }
      if (!input.date) {
        return { ok: false, message: "Expense date is required." };
      }
      const expenseDate = new Date(input.date);
      if (Number.isNaN(expenseDate.getTime())) {
        return { ok: false, message: "Expense date is invalid." };
      }

      const nextExpenses = [
        ...data.expenses,
        {
          id: generateId("exp"),
          headId: input.headId,
          desc: input.desc?.trim() || "",
          amount: input.amount,
          date: input.date,
          month: expenseDate.getMonth() + 1,
          year: expenseDate.getFullYear(),
          createdAt: Date.now()
        }
      ];

      await persistCommunity(communityId, data, "expenses", nextExpenses);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Unable to save expense." };
    }
  }

  async function saveAmenity(input: AmenityInput): Promise<LoginResult> {
    try {
      const { communityId } = requireAdminSession();
      const data = communityData ?? (await loadCommunityData(communityId));
      const name = input.name.trim();
      if (!name) {
        return { ok: false, message: "Amenity name is required." };
      }
      const validSlots = input.slots.filter((slot) => slot.label.trim());
      if (!validSlots.length) {
        return { ok: false, message: "Add at least one slot." };
      }
      const normalizedSlots = validSlots.map((slot) => ({
        id: slot.id || generateId("slot"),
        label: slot.label.trim(),
        charge: slot.charge || 0
      }));
      const nextAmenities = input.id
        ? data.amenities.map((amenity) =>
            amenity.id === input.id
              ? {
                  ...amenity,
                  name,
                  instructions: input.instructions?.trim() || "",
                  enabled: input.enabled,
                  chargesEnabled: input.chargesEnabled,
                  advanceDays: input.advanceDays || 30,
                  slots: normalizedSlots
                }
              : amenity
          )
        : [
            ...data.amenities,
            {
              id: generateId("am"),
              name,
              instructions: input.instructions?.trim() || "",
              enabled: input.enabled,
              chargesEnabled: input.chargesEnabled,
              advanceDays: input.advanceDays || 30,
              slots: normalizedSlots
            }
          ];

      await persistCommunity(communityId, data, "amenities", nextAmenities);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Unable to save amenity." };
    }
  }

  async function deleteAmenity(amenityId: string): Promise<LoginResult> {
    try {
      const { communityId } = requireAdminSession();
      const data = communityData ?? (await loadCommunityData(communityId));
      const nextAmenities = data.amenities.filter((amenity) => amenity.id !== amenityId);
      const nextBookings = data.amenityBookings.filter((booking) => booking.amenityId !== amenityId);
      await upsertCommunityValue(communityId, "amenities", nextAmenities);
      await upsertCommunityValue(communityId, "amenityBookings", nextBookings);
      setCommunityData({ ...data, amenities: nextAmenities, amenityBookings: nextBookings });
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Unable to delete amenity." };
    }
  }

  async function updateVisitorStatus(visitorId: string, status: string): Promise<LoginResult> {
    try {
      const { communityId } = requireAdminSession();
      const data = communityData ?? (await loadCommunityData(communityId));
      const nextVisitors = data.visitors.map((visitor) => {
        if (visitor.id !== visitorId) return visitor;
        if (status === "arrived") {
          return { ...visitor, status, entryTime: Date.now() };
        }
        if (status === "departed") {
          return { ...visitor, status, exitTime: Date.now() };
        }
        return { ...visitor, status };
      });
      await persistCommunity(communityId, data, "visitors", nextVisitors);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Unable to update visitor." };
    }
  }

  async function saveVehicle(input: VehicleInput): Promise<LoginResult> {
    try {
      const { communityId } = requireAdminSession();
      const data = communityData ?? (await loadCommunityData(communityId));
      const owner = data.owners.find((item) => item.id === input.ownerId);
      if (!owner) {
        return { ok: false, message: "Please select a valid owner site." };
      }
      const number = input.number.trim().toUpperCase();
      if (!number) {
        return { ok: false, message: "Vehicle number is required." };
      }
      const duplicate = data.vehicles.some((vehicle) => vehicle.number === number);
      if (duplicate) {
        return { ok: false, message: "This vehicle number is already registered." };
      }

      const nextVehicles = [
        ...data.vehicles,
        {
          id: generateId("veh"),
          ownerId: input.ownerId,
          ownerEmail: owner.email,
          number,
          type: input.type.trim() || "Car",
          make: input.make?.trim() || "",
          color: input.color?.trim() || "",
          notes: input.notes?.trim() || "",
          createdAt: Date.now()
        }
      ];
      await persistCommunity(communityId, data, "vehicles", nextVehicles);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Unable to save vehicle." };
    }
  }

  async function deleteVehicle(vehicleId: string): Promise<LoginResult> {
    try {
      const { communityId } = requireAdminSession();
      const data = communityData ?? (await loadCommunityData(communityId));
      const nextVehicles = data.vehicles.filter((vehicle) => vehicle.id !== vehicleId);
      await persistCommunity(communityId, data, "vehicles", nextVehicles);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Unable to delete vehicle." };
    }
  }

  async function logGateEntry(input: GateEntryInput): Promise<LoginResult> {
    try {
      const { communityId } = requireAdminSession();
      const data = communityData ?? (await loadCommunityData(communityId));
      const number = input.number.trim().toUpperCase();
      if (!number) {
        return { ok: false, message: "Vehicle number is required." };
      }
      const alreadyInside = data.gateLogs.some((log) => log.number === number && log.status === "inside");
      if (alreadyInside) {
        return { ok: false, message: "This vehicle is already marked inside." };
      }

      const vehicle = data.vehicles.find((item) => item.number === number);
      const owner = vehicle ? data.owners.find((item) => item.id === vehicle.ownerId) : null;
      const ownerSite = owner
        ? `${owner.house || owner.unitNo || owner.siteNo || owner.flatNo || owner.houseNo || "-"} - ${owner.cross || "-"}`
        : "-";
      const nextGateLogs = [
        ...data.gateLogs,
        {
          id: generateId("gate"),
          number,
          ownerId: owner?.id || null,
          ownerName: owner?.name || input.visitorName?.trim() || "Visitor",
          ownerSite,
          vehType: vehicle?.type || "-",
          purpose: input.purpose.trim() || "Resident",
          visitorName: input.visitorName?.trim() || "",
          entryTime: new Date().toISOString(),
          exitTime: null,
          status: "inside" as const,
          createdAt: Date.now()
        }
      ];
      await persistCommunity(communityId, data, "gateLogs", nextGateLogs);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Unable to log gate entry." };
    }
  }

  async function logGateExit(vehicleNumber: string): Promise<LoginResult> {
    try {
      const { communityId } = requireAdminSession();
      const data = communityData ?? (await loadCommunityData(communityId));
      const number = vehicleNumber.trim().toUpperCase();
      const target = data.gateLogs.find((log) => log.number === number && log.status === "inside");
      if (!target) {
        return { ok: false, message: "No active gate entry found for this vehicle." };
      }

      const nextGateLogs = data.gateLogs.map((log) =>
        log.id === target.id
          ? { ...log, status: "exited" as const, exitTime: new Date().toISOString() }
          : log
      );
      await persistCommunity(communityId, data, "gateLogs", nextGateLogs);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Unable to log gate exit." };
    }
  }

  async function updateOwnerProfile(input: OwnerProfileInput): Promise<LoginResult> {
    try {
      const { communityId, email } = requireOwnerSession();
      const data = communityData ?? (await loadCommunityData(communityId));
      const nextEmail = input.email.trim().toLowerCase();
      const nextOwners = data.owners.map((owner) =>
        owner.email.toLowerCase() === email
          ? { ...owner, name: input.name.trim(), mobile: input.mobile.trim(), email: nextEmail }
          : owner
      );

      await upsertCommunityValue(communityId, "owners", nextOwners);
      const nextSession: Session = { ...session!, email: nextEmail };
      await setStoredSession(nextSession);
      setSession(nextSession);
      setCommunityData({ ...data, owners: nextOwners });
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Unable to update profile." };
    }
  }

  async function changeOwnerPassword(
    currentPassword: string,
    nextPassword: string,
    confirmPassword: string
  ): Promise<LoginResult> {
    try {
      const { communityId, email } = requireOwnerSession();
      if (nextPassword.length < 8) {
        return { ok: false, message: "New password must be at least 8 characters." };
      }
      if (nextPassword !== confirmPassword) {
        return { ok: false, message: "Passwords do not match." };
      }

      const data = communityData ?? (await loadCommunityData(communityId));
      const currentOwner = data.owners.find(
        (owner) => owner.email.toLowerCase() === email
      );
      if (!currentOwner || !(await matchesPassword(currentPassword, currentOwner.password))) {
        return { ok: false, message: "Current password is incorrect." };
      }

      const nextHash = await sha256(nextPassword);
      const nextOwners = data.owners.map((owner) =>
        owner.email.toLowerCase() === email ? { ...owner, password: nextHash } : owner
      );
      await upsertCommunityValue(communityId, "owners", nextOwners);
      setCommunityData({ ...data, owners: nextOwners });
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Unable to change password." };
    }
  }

  async function payOwnerInvoice(input: OwnerPaymentInput): Promise<LoginResult> {
    try {
      const { communityId, email } = requireOwnerSession();
      const data = communityData ?? (await loadCommunityData(communityId));
      const ownerIds = data.owners.filter((owner) => owner.email.toLowerCase() === email).map((owner) => owner.id);
      const invoiceIndex = data.invoices.findIndex(
        (invoice) => invoice.id === input.invoiceId && ownerIds.includes(invoice.ownerId)
      );
      if (invoiceIndex < 0) {
        return { ok: false, message: "Invoice not found." };
      }

      const invoice = data.invoices[invoiceIndex];
      const remaining = Math.max(
        0,
        (invoice.amount || 0) + (invoice.penalty || 0) - (invoice.paidAmount || 0)
      );
      if (remaining <= 0) {
        return { ok: false, message: "This invoice is already paid." };
      }

      const paymentId = input.gatewayPaymentId ? `rzp_${input.gatewayPaymentId}` : `p${Date.now()}`;
      const newPaidAmount = (invoice.paidAmount || 0) + remaining;
      const nextInvoices = [...data.invoices];
      nextInvoices[invoiceIndex] = {
        ...invoice,
        paidAmount: newPaidAmount,
        status: "paid",
        paidDate: input.date,
        paymentId
      };

      const nextPayments = [
        ...data.payments,
        {
          id: paymentId,
          ownerId: invoice.ownerId,
          amount: remaining,
          date: input.date,
          month: invoice.month,
          year: invoice.year,
          mode: input.mode,
          notes: input.reference,
          razorpayPaymentId: input.gatewayPaymentId,
          razorpayOrderId: input.gatewayOrderId,
          createdAt: Date.now()
        }
      ];

      await upsertCommunityValue(communityId, "invoices", nextInvoices);
      await upsertCommunityValue(communityId, "payments", nextPayments);
      setCommunityData({ ...data, invoices: nextInvoices, payments: nextPayments });
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Unable to record payment." };
    }
  }

  async function bookAmenity(amenityId: string, slotId: string, date: string): Promise<LoginResult> {
    try {
      const { communityId, email } = requireOwnerSession();
      const data = communityData ?? (await loadCommunityData(communityId));
      const amenity = data.amenities.find((item) => item.id === amenityId && item.enabled !== false);
      if (!amenity) {
        return { ok: false, message: "Amenity not found." };
      }
      const slot = amenity.slots?.find((item) => item.id === slotId);
      if (!slot) {
        return { ok: false, message: "Please select a slot." };
      }
      const alreadyBooked = data.amenityBookings.find(
        (booking) =>
          booking.amenityId === amenityId &&
          booking.date === date &&
          booking.ownerEmail.toLowerCase() === email &&
          booking.status === "confirmed"
      );
      if (alreadyBooked) {
        return { ok: false, message: "You already booked this amenity for that date." };
      }

      const ownerRecords = data.owners.filter((owner) => owner.email.toLowerCase() === email);
      const ownerName = ownerRecords[0]?.name || session?.email || "";
      const unitNo = ownerRecords
        .map((owner) => owner.unitNo || owner.flatNo || owner.siteNo || owner.houseNo || owner.house || "")
        .filter(Boolean)
        .join(", ");

      const nextBookings = [
        ...data.amenityBookings,
        {
          id: generateId("bk"),
          amenityId,
          slotId,
          date,
          ownerEmail: session!.email,
          ownerName,
          unitNo,
          amount: amenity.chargesEnabled ? slot.charge || 0 : 0,
          status: "confirmed",
          createdAt: Date.now()
        }
      ];
      await upsertCommunityValue(communityId, "amenityBookings", nextBookings);
      setCommunityData({ ...data, amenityBookings: nextBookings });
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Unable to book amenity." };
    }
  }

  async function cancelAmenityBooking(bookingId: string): Promise<LoginResult> {
    try {
      const { communityId, email } = requireOwnerSession();
      const data = communityData ?? (await loadCommunityData(communityId));
      const nextBookings = data.amenityBookings.map((booking) =>
        booking.id === bookingId && booking.ownerEmail.toLowerCase() === email
          ? { ...booking, status: "cancelled" }
          : booking
      );
      await upsertCommunityValue(communityId, "amenityBookings", nextBookings);
      setCommunityData({ ...data, amenityBookings: nextBookings });
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Unable to cancel booking." };
    }
  }

  async function registerVisitor(input: VisitorInput): Promise<LoginResult & { passCode?: string }> {
    try {
      const { communityId, email } = requireOwnerSession();
      if (!input.visitorName.trim() || !input.visitorPhone.trim() || !input.visitDate) {
        return { ok: false, message: "Name, phone and date are required." };
      }
      const data = communityData ?? (await loadCommunityData(communityId));
      const ownerRecords = data.owners.filter((owner) => owner.email.toLowerCase() === email);
      const ownerName = ownerRecords[0]?.name || session?.email || "";
      const unitNo = ownerRecords
        .map((owner) => owner.unitNo || owner.flatNo || owner.siteNo || owner.houseNo || owner.house || "")
        .filter(Boolean)
        .join(", ");
      const passCode = `VIS-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
      const nextVisitors = [
        ...data.visitors,
        {
          id: generateId("vis"),
          ownerEmail: session!.email,
          ownerName,
          unitNo,
          visitorName: input.visitorName.trim(),
          visitorPhone: input.visitorPhone.trim(),
          visitDate: input.visitDate,
          purpose: input.purpose?.trim(),
          passCode,
          status: "pending",
          entryTime: null,
          exitTime: null,
          createdAt: Date.now()
        }
      ];
      await upsertCommunityValue(communityId, "visitors", nextVisitors);
      setCommunityData({ ...data, visitors: nextVisitors });
      return { ok: true, passCode };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Unable to register visitor." };
    }
  }

  async function requestPasswordReset(email: string): Promise<LoginResult & { otp?: string }> {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const platform = await loadPlatformData();
      let exists = platform.admin?.email === normalizedEmail;

      for (const community of platform.communities ?? []) {
        const data = await loadCommunityData(community.id);
        exists =
          exists ||
          data.admin?.email === normalizedEmail ||
          data.staffList.some((member) => member.email.toLowerCase() === normalizedEmail) ||
          data.owners.some((owner) => owner.email.toLowerCase() === normalizedEmail);
        if (exists) break;
      }

      if (!exists) {
        return { ok: false, message: "No account found with this email." };
      }

      const otp = generateOtp();
      const payload: OtpStore = {
        email: normalizedEmail,
        otp,
        expiry: Date.now() + 10 * 60 * 1000
      };

      await upsertPlatformValue("otp_store", payload);
      setOtpStore(payload);
      return { ok: true, otp };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to generate OTP."
      };
    }
  }

  async function resetPassword(
    otp: string,
    nextPassword: string,
    confirmPassword: string
  ): Promise<LoginResult> {
    try {
      if (!otpStore || otpStore.otp !== otp.trim()) {
        return { ok: false, message: "Incorrect OTP." };
      }
      if (Date.now() > otpStore.expiry) {
        return { ok: false, message: "OTP expired. Please request a new one." };
      }
      if (nextPassword.length < 8) {
        return { ok: false, message: "Password must be at least 8 characters." };
      }
      if (nextPassword !== confirmPassword) {
        return { ok: false, message: "Passwords do not match." };
      }

      const hashed = await sha256(nextPassword);
      const platform = await loadPlatformData();
      const targetEmail = otpStore.email;

      if (platform.admin?.email === targetEmail) {
        await upsertPlatformValue("admin", { ...platform.admin, password: hashed });
      } else {
        for (const community of platform.communities ?? []) {
          const data = await loadCommunityData(community.id);

          if (data.admin?.email === targetEmail) {
            await upsertCommunityValue(community.id, "admin", { ...data.admin, password: hashed });
            break;
          }

          if (data.staffList.some((member) => member.email.toLowerCase() === targetEmail)) {
            await upsertCommunityValue(
              community.id,
              "staffList",
              data.staffList.map((member) =>
                member.email.toLowerCase() === targetEmail ? { ...member, password: hashed } : member
              )
            );
            break;
          }

          if (data.owners.some((owner) => owner.email.toLowerCase() === targetEmail)) {
            await upsertCommunityValue(
              community.id,
              "owners",
              data.owners.map((owner) =>
                owner.email.toLowerCase() === targetEmail ? { ...owner, password: hashed } : owner
              )
            );
            break;
          }
        }
      }

      await upsertPlatformValue("otp_store", null);
      setOtpStore(null);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Unable to reset password."
      };
    }
  }

  const value: AppContextValue = {
    booting,
    refreshing,
    configured: env.hasSupabaseConfig,
    session,
    platformAdminEmail,
    communities,
    activeCommunity,
    communityData,
    otpStore,
    pendingPlatformAuth,
    pendingCommunityAuth,
    login,
    verifyPlatformTotp,
    cancelPlatformTotp,
    verifyCommunityTotp,
    cancelCommunityTotp,
    refresh,
      logout,
      createCommunity,
      enterCommunity,
      requestPasswordReset,
      resetPassword,
      createOwner,
      createInvoice,
      saveStaffMember,
      deleteStaffMember,
      createExpenseHead,
      createExpense,
      saveAmenity,
      deleteAmenity,
      updateVisitorStatus,
      saveVehicle,
      deleteVehicle,
      logGateEntry,
      logGateExit,
      updateOwnerProfile,
      changeOwnerPassword,
    payOwnerInvoice,
    bookAmenity,
    cancelAmenityBooking,
    registerVisitor
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used inside AppProvider");
  }
  return context;
}

import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useApp } from "../context/AppContext";
import { Button, EmptyState, Input, Label, SectionCard, StatTile } from "../components/ui";
import { RoleShell } from "../components/role-shell";
import { theme } from "../theme";
import { formatCurrency, invoiceRemaining, invoiceStatus, monthName } from "../utils/format";
import type {
  Amenity,
  AmenitySlot,
  ExpenseEntry,
  ExpenseHead,
  GateLog,
  Invoice,
  Owner,
  StaffMember,
  Vehicle,
  Visitor
} from "../types/models";

type Tab =
  | "dashboard"
  | "owners"
  | "income"
  | "expense"
  | "invoices"
  | "reports"
  | "staff"
  | "amenities"
  | "visitors"
  | "vehicles"
  | "gate"
  | "profile";

export function AdminScreen() {
  const { activeCommunity, communityData, session, logout, refresh, refreshing } = useApp();
  const [tab, setTab] = useState<Tab>("dashboard");

  const owners = communityData?.owners ?? [];
  const invoices = communityData?.invoices ?? [];
  const payments = communityData?.payments ?? [];
  const expenses = communityData?.expenses ?? [];
  const vehicles = communityData?.vehicles ?? [];
  const gateLogs = communityData?.gateLogs ?? [];
  const visitors = communityData?.visitors ?? [];
  const amenities = communityData?.amenities ?? [];
  const pendingInvoices = invoices.filter((invoice) => invoiceRemaining(invoice) > 0);
  const overdueInvoices = invoices.filter((invoice) => invoiceStatus(invoice) === "overdue");
  const insideVehicles = gateLogs.filter((log) => log.status === "inside");
  const pendingVisitors = visitors.filter((visitor) => visitor.status === "pending");
  const activeVisitors = visitors.filter((visitor) => visitor.status === "arrived");

  const summary = useMemo(
    () => ({
      ownerCount: owners.length,
      invoiceCount: invoices.length,
      pendingAmount: pendingInvoices.reduce((sum, invoice) => sum + invoiceRemaining(invoice), 0),
      paymentAmount: payments.reduce((sum, payment) => sum + payment.amount, 0),
      expenseAmount: expenses.reduce((sum, expense) => sum + expense.amount, 0)
    }),
    [owners.length, invoices, pendingInvoices, payments, expenses]
  );

  return (
    <RoleShell
      title={activeCommunity?.name ?? "Community admin"}
      subtitle={`Management console for ${session?.staffName ?? "Admin"} · ${session?.email ?? ""}`}
      accentColors={["#10233f", "#1859d1"]}
      navItems={[
        { key: "dashboard", label: "Dashboard" },
        { key: "owners", label: "Owners" },
        { key: "income", label: "Income" },
        { key: "expense", label: "Expense" },
        { key: "invoices", label: "Invoices" },
        { key: "reports", label: "Reports" },
        { key: "staff", label: "Staff" },
        { key: "amenities", label: "Amenities" },
        { key: "visitors", label: "Visitors" },
        { key: "vehicles", label: "Vehicles" },
        { key: "gate", label: "Gate" },
        { key: "profile", label: "Profile" }
      ]}
      activeTab={tab}
      onSelectTab={setTab}
      actions={<Button title="Refresh" onPress={() => void refresh()} tone="secondary" busy={refreshing} />}
    >
      {tab === "dashboard" ? (
        <DashboardPane
          summary={summary}
          overdueCount={overdueInvoices.length}
          pendingVisitors={pendingVisitors.length}
          activeVisitors={activeVisitors.length}
          vehicleCount={vehicles.length}
          insideCount={insideVehicles.length}
          amenityCount={amenities.length}
          communitySlug={activeCommunity?.slug ?? "-"}
        />
      ) : null}
      {tab === "owners" ? <OwnersPane /> : null}
      {tab === "income" ? <IncomePane /> : null}
      {tab === "expense" ? <ExpensePane /> : null}
      {tab === "invoices" ? <InvoicesPane /> : null}
      {tab === "reports" ? <ReportsPane /> : null}
      {tab === "staff" ? <StaffPane /> : null}
      {tab === "amenities" ? <AmenitiesPane /> : null}
      {tab === "visitors" ? <VisitorsPane /> : null}
      {tab === "vehicles" ? <VehiclesPane /> : null}
      {tab === "gate" ? <GatePane /> : null}
      {tab === "profile" ? (
        <SectionCard title="Profile">
          <Text style={styles.infoText}>Community: {activeCommunity?.name}</Text>
          <Text style={styles.infoText}>Role: {session?.staffRole ?? "superadmin"}</Text>
          <Text style={styles.infoText}>Email: {session?.email}</Text>
          <Text style={styles.infoText}>
            This native admin app now covers core resident, finance, amenity, visitor, vehicle, and gate workflows from the web portal.
          </Text>
          <Button title="Logout" onPress={() => void logout()} />
        </SectionCard>
      ) : null}
    </RoleShell>
  );
}

function DashboardPane({
  summary,
  overdueCount,
  pendingVisitors,
  activeVisitors,
  vehicleCount,
  insideCount,
  amenityCount,
  communitySlug
}: {
  summary: {
    ownerCount: number;
    invoiceCount: number;
    pendingAmount: number;
    paymentAmount: number;
    expenseAmount: number;
  };
  overdueCount: number;
  pendingVisitors: number;
  activeVisitors: number;
  vehicleCount: number;
  insideCount: number;
  amenityCount: number;
  communitySlug: string;
}) {
  return (
    <>
      <SectionCard title="Admin summary">
        <View style={styles.statsGrid}>
          <StatTile label="Owners" value={String(summary.ownerCount)} accent={theme.colors.primary} />
          <StatTile label="Invoices" value={String(summary.invoiceCount)} accent={theme.colors.warning} />
        </View>
        <View style={styles.statsGrid}>
          <StatTile label="Pending dues" value={formatCurrency(summary.pendingAmount)} accent={theme.colors.danger} />
          <StatTile label="Collected" value={formatCurrency(summary.paymentAmount)} accent={theme.colors.success} />
        </View>
        <View style={styles.statsGrid}>
          <StatTile label="Expenses" value={formatCurrency(summary.expenseAmount)} accent={theme.colors.warning} />
          <StatTile label="Net cash" value={formatCurrency(summary.paymentAmount - summary.expenseAmount)} accent={theme.colors.accent} />
        </View>
      </SectionCard>

      <SectionCard title="Operations focus">
        <View style={styles.highlightGrid}>
          <HighlightCard title="Overdue invoices" value={String(overdueCount)} meta="Need follow-up with residents" />
          <HighlightCard title="Pending visitors" value={String(pendingVisitors)} meta="Waiting for approval" />
          <HighlightCard title="Visitors inside" value={String(activeVisitors)} meta="Marked as arrived" />
          <HighlightCard title="Vehicles inside" value={String(insideCount)} meta={`${vehicleCount} vehicles registered`} />
          <HighlightCard title="Amenities" value={String(amenityCount)} meta="Bookable community resources" />
          <HighlightCard title="Community slug" value={communitySlug} meta="Portal identifier" />
        </View>
      </SectionCard>
    </>
  );
}

function IncomePane() {
  const { communityData } = useApp();
  const owners = communityData?.owners ?? [];
  const invoices = communityData?.invoices ?? [];
  const payments = communityData?.payments ?? [];
  const pendingInvoices = invoices.filter((invoice) => invoiceRemaining(invoice) > 0);
  const recentPayments = payments
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const pendingOwnerCount = new Set(pendingInvoices.map((invoice) => invoice.ownerId)).size;

  return (
    <>
      <SectionCard title="Collection status">
        <View style={styles.statsGrid}>
          <StatTile label="Pending collection" value={formatCurrency(pendingInvoices.reduce((sum, invoice) => sum + invoiceRemaining(invoice), 0))} accent={theme.colors.danger} />
          <StatTile label="Pending owners" value={String(pendingOwnerCount)} accent={theme.colors.warning} />
        </View>
      </SectionCard>
      <SectionCard title="Recent payments">
        {!recentPayments.length ? (
          <EmptyState title="No payments yet" body="Recorded owner payments will appear here as income activity." />
        ) : (
          <View style={styles.list}>
            {recentPayments.map((payment) => {
              const owner = owners.find((item) => item.id === payment.ownerId);
              return (
                <View key={payment.id} style={styles.rowCard}>
                  <Text style={styles.rowTitle}>{formatCurrency(payment.amount)}</Text>
                  <Text style={styles.rowMeta}>{monthName(payment.month)} {payment.year}</Text>
                  <Text style={styles.rowMeta}>Owner: {owner?.name || "Unknown owner"}</Text>
                  <Text style={styles.rowMeta}>
                    Site: {formatUnit(owner)} · {owner?.cross || "-"}
                  </Text>
                  <Text style={styles.rowMeta}>{payment.date} · {payment.mode || "Recorded payment"}</Text>
                </View>
              );
            })}
          </View>
        )}
      </SectionCard>
    </>
  );
}

function OwnersPane() {
  const { communityData, createOwner } = useApp();
  const owners = communityData?.owners ?? [];
  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    unitNo: "",
    cross: "",
    temporaryPassword: ""
  });
  const [busy, setBusy] = useState(false);

  async function handleCreateOwner() {
    setBusy(true);
    const result = await createOwner(form);
    setBusy(false);
    if (!result.ok) {
      Alert.alert("Could not add owner", result.message);
      return;
    }
    setForm({ name: "", email: "", mobile: "", unitNo: "", cross: "", temporaryPassword: "" });
    Alert.alert("Owner added", "The owner record was created successfully.");
  }

  return (
    <>
      <SectionCard title="Add owner">
        <Text style={styles.infoText}>Create a resident login directly from mobile so billing and owner self-service can start immediately.</Text>
        <Field label="Owner name" value={form.name} onChangeText={(name) => setForm((current) => ({ ...current, name }))} placeholder="Resident name" />
        <Field label="Email" value={form.email} onChangeText={(email) => setForm((current) => ({ ...current, email }))} placeholder="owner@email.com" autoCapitalize="none" keyboardType="email-address" />
        <Field label="Mobile" value={form.mobile} onChangeText={(mobile) => setForm((current) => ({ ...current, mobile }))} placeholder="Phone number" keyboardType="phone-pad" />
        <View style={styles.inlineFields}>
          <View style={styles.inlineField}>
            <Field label="Unit" value={form.unitNo} onChangeText={(unitNo) => setForm((current) => ({ ...current, unitNo }))} placeholder="A-101" />
          </View>
          <View style={styles.inlineField}>
            <Field label="Cross / Block" value={form.cross} onChangeText={(cross) => setForm((current) => ({ ...current, cross }))} placeholder="Block A" />
          </View>
        </View>
        <Field label="Temporary password" value={form.temporaryPassword} onChangeText={(temporaryPassword) => setForm((current) => ({ ...current, temporaryPassword }))} placeholder="Minimum 8 characters" secureTextEntry />
        <Button title="Add Owner" onPress={() => void handleCreateOwner()} busy={busy} />
      </SectionCard>

      <SectionCard title="Residents and owners">
        {!owners.length ? (
          <EmptyState title="No owners found" body="Owner records will appear here once they exist in this community." />
        ) : (
          <View style={styles.list}>
            {owners.map((owner) => (
              <View key={owner.id} style={styles.rowCard}>
                <Text style={styles.rowTitle}>{owner.name}</Text>
                <Text style={styles.rowMeta}>{owner.email}</Text>
                <Text style={styles.rowMeta}>Site: {formatUnit(owner)} · {owner.cross || "-"}</Text>
                <Text style={styles.rowMeta}>Mobile: {owner.mobile || "Not set"}</Text>
                <Text style={styles.rowMeta}>Status: {owner.status || "-"}</Text>
              </View>
            ))}
          </View>
        )}
      </SectionCard>
    </>
  );
}

function ExpensePane() {
  const { communityData, createExpenseHead, createExpense } = useApp();
  const heads = communityData?.expenseHeads ?? [];
  const expenses = (communityData?.expenses ?? []).slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const [headForm, setHeadForm] = useState({ name: "", budget: "" });
  const [expenseForm, setExpenseForm] = useState({
    headId: "",
    desc: "",
    amount: "",
    date: today()
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!heads.length) return;
    setExpenseForm((current) => (current.headId ? current : { ...current, headId: heads[0].id }));
  }, [heads]);

  async function onCreateHead() {
    setBusy(true);
    const result = await createExpenseHead({ name: headForm.name, budget: Number(headForm.budget || 0) });
    setBusy(false);
    if (!result.ok) {
      Alert.alert("Could not add expense head", result.message);
      return;
    }
    setHeadForm({ name: "", budget: "" });
  }

  async function onCreateExpense() {
    setBusy(true);
    const result = await createExpense({
      headId: expenseForm.headId,
      desc: expenseForm.desc,
      amount: Number(expenseForm.amount),
      date: expenseForm.date
    });
    setBusy(false);
    if (!result.ok) {
      Alert.alert("Could not save expense", result.message);
      return;
    }
    setExpenseForm((current) => ({ ...current, desc: "", amount: "", date: today() }));
  }

  return (
    <>
      <SectionCard title="Expense heads">
        <Field label="Head name" value={headForm.name} onChangeText={(name) => setHeadForm((current) => ({ ...current, name }))} placeholder="Security, Maintenance, Utilities" />
        <Field label="Budget (optional)" value={headForm.budget} onChangeText={(budget) => setHeadForm((current) => ({ ...current, budget }))} placeholder="50000" keyboardType="numeric" />
        <Button title="Add Expense Head" onPress={() => void onCreateHead()} busy={busy} />
        {heads.length ? (
          <View style={styles.list}>
            {heads.map((head) => (
              <View key={head.id} style={styles.rowCard}>
                <Text style={styles.rowTitle}>{head.name}</Text>
                <Text style={styles.rowMeta}>Budget: {formatCurrency(head.budget || 0)}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </SectionCard>

      <SectionCard title="Post expense">
        {!heads.length ? (
          <EmptyState title="Add an expense head first" body="Create at least one expense head before posting expenses." />
        ) : (
          <>
            <Chooser
              label="Expense head"
              options={heads.map((head) => ({ key: head.id, label: head.name }))}
              active={expenseForm.headId}
              onSelect={(headId) => setExpenseForm((current) => ({ ...current, headId }))}
            />
            <Field label="Description" value={expenseForm.desc} onChangeText={(desc) => setExpenseForm((current) => ({ ...current, desc }))} placeholder="Electricity bill, cleaner payment..." />
            <Field label="Amount" value={expenseForm.amount} onChangeText={(amount) => setExpenseForm((current) => ({ ...current, amount }))} placeholder="2500" keyboardType="numeric" />
            <Field label="Date" value={expenseForm.date} onChangeText={(date) => setExpenseForm((current) => ({ ...current, date }))} placeholder="YYYY-MM-DD" />
            <Button title="Save Expense" onPress={() => void onCreateExpense()} busy={busy} />
          </>
        )}
      </SectionCard>

      <SectionCard title="Expense entries">
        {!expenses.length ? (
          <EmptyState title="No expenses yet" body="Posted expenses will appear here." />
        ) : (
          <View style={styles.list}>
            {expenses.map((expense) => {
              const head = heads.find((item) => item.id === expense.headId);
              return (
                <View key={expense.id} style={styles.rowCard}>
                  <Text style={styles.rowTitle}>{head?.name || "Expense"}</Text>
                  <Text style={styles.rowMeta}>{expense.desc || "No description"}</Text>
                  <Text style={styles.rowMeta}>{expense.date}</Text>
                  <Text style={styles.rowMeta}>{formatCurrency(expense.amount)}</Text>
                </View>
              );
            })}
          </View>
        )}
      </SectionCard>
    </>
  );
}

function InvoicesPane() {
  const { communityData, createInvoice } = useApp();
  const invoices = communityData?.invoices ?? [];
  const owners = communityData?.owners ?? [];
  const [form, setForm] = useState({
    ownerId: "",
    amount: "",
    penalty: "",
    dueDate: today(),
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
    freq: "monthly"
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!owners.length) return;
    setForm((current) => (current.ownerId ? current : { ...current, ownerId: owners[0].id }));
  }, [owners]);

  async function handleCreateInvoice() {
    setBusy(true);
    const result = await createInvoice({
      ownerId: form.ownerId,
      amount: Number(form.amount),
      penalty: Number(form.penalty || 0),
      dueDate: form.dueDate,
      month: Number(form.month),
      year: Number(form.year),
      freq: form.freq
    });
    setBusy(false);
    if (!result.ok) {
      Alert.alert("Could not create invoice", result.message);
      return;
    }
    setForm((current) => ({ ...current, amount: "", penalty: "", dueDate: today() }));
  }

  return (
    <>
      <SectionCard title="Create invoice">
        {!owners.length ? (
          <EmptyState title="Add an owner first" body="Invoice creation becomes available once at least one owner exists in this community." />
        ) : (
          <>
            <Chooser
              label="Owner"
              options={owners.map((owner) => ({ key: owner.id, label: owner.name }))}
              active={form.ownerId}
              onSelect={(ownerId) => setForm((current) => ({ ...current, ownerId }))}
            />
            <View style={styles.inlineFields}>
              <View style={styles.inlineField}>
                <Field label="Amount" value={form.amount} onChangeText={(amount) => setForm((current) => ({ ...current, amount }))} placeholder="2500" keyboardType="numeric" />
              </View>
              <View style={styles.inlineField}>
                <Field label="Penalty" value={form.penalty} onChangeText={(penalty) => setForm((current) => ({ ...current, penalty }))} placeholder="0" keyboardType="numeric" />
              </View>
            </View>
            <View style={styles.inlineFields}>
              <View style={styles.inlineField}>
                <Field label="Month" value={form.month} onChangeText={(month) => setForm((current) => ({ ...current, month }))} placeholder="4" keyboardType="numeric" />
              </View>
              <View style={styles.inlineField}>
                <Field label="Year" value={form.year} onChangeText={(year) => setForm((current) => ({ ...current, year }))} placeholder="2026" keyboardType="numeric" />
              </View>
            </View>
            <Field label="Due date" value={form.dueDate} onChangeText={(dueDate) => setForm((current) => ({ ...current, dueDate }))} placeholder="YYYY-MM-DD" />
            <Chooser
              label="Frequency"
              options={[
                { key: "monthly", label: "Monthly" },
                { key: "yearly", label: "Yearly" }
              ]}
              active={form.freq}
              onSelect={(freq) => setForm((current) => ({ ...current, freq }))}
            />
            <Button title="Create Invoice" onPress={() => void handleCreateInvoice()} busy={busy} />
          </>
        )}
      </SectionCard>

      <SectionCard title="Invoice control">
        {!invoices.length ? (
          <EmptyState title="No invoices yet" body="Invoices generated in mobile will appear here." />
        ) : (
          <View style={styles.list}>
            {invoices
              .slice()
              .sort((a, b) => b.year - a.year || b.month - a.month)
              .map((invoice) => {
                const owner = owners.find((item) => item.id === invoice.ownerId);
                const status = invoiceStatus(invoice);
                const period = invoice.freq === "yearly" ? `Year ${invoice.year}` : `${monthName(invoice.month)} ${invoice.year}`;
                return (
                  <View key={invoice.id} style={styles.rowCard}>
                    <View style={styles.rowTop}>
                      <Text style={styles.rowTitle}>{owner?.name ?? "Unknown owner"}</Text>
                      <StatusBadge status={status} />
                    </View>
                    <Text style={styles.rowMeta}>{period}</Text>
                    <Text style={styles.rowMeta}>Site: {formatUnit(owner)} · {owner?.cross || "-"}</Text>
                    <Text style={styles.rowMeta}>Total: {formatCurrency((invoice.amount || 0) + (invoice.penalty || 0))}</Text>
                    <Text style={styles.rowMeta}>Remaining: {formatCurrency(invoiceRemaining(invoice))}</Text>
                    <Text style={styles.rowMeta}>Due date: {invoice.dueDate || "Not set"}</Text>
                  </View>
                );
              })}
          </View>
        )}
      </SectionCard>
    </>
  );
}

function ReportsPane() {
  const { communityData } = useApp();
  const payments = communityData?.payments ?? [];
  const expenses = communityData?.expenses ?? [];
  const invoices = communityData?.invoices ?? [];
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));

  const numericMonth = Number(month);
  const numericYear = Number(year);
  const monthPayments = payments.filter((payment) => payment.month === numericMonth && payment.year === numericYear);
  const monthExpenses = expenses.filter((expense) => expense.month === numericMonth && expense.year === numericYear);
  const monthInvoices = invoices.filter((invoice) => invoice.month === numericMonth && invoice.year === numericYear);
  const income = monthPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const expense = monthExpenses.reduce((sum, item) => sum + item.amount, 0);
  const net = income - expense;

  return (
    <>
      <SectionCard title="Monthly report">
        <View style={styles.inlineFields}>
          <View style={styles.inlineField}>
            <Field label="Month" value={month} onChangeText={setMonth} placeholder="4" keyboardType="numeric" />
          </View>
          <View style={styles.inlineField}>
            <Field label="Year" value={year} onChangeText={setYear} placeholder="2026" keyboardType="numeric" />
          </View>
        </View>
        <View style={styles.statsGrid}>
          <StatTile label="Income" value={formatCurrency(income)} accent={theme.colors.success} />
          <StatTile label="Expense" value={formatCurrency(expense)} accent={theme.colors.warning} />
        </View>
        <View style={styles.statsGrid}>
          <StatTile label="Net" value={formatCurrency(net)} accent={theme.colors.primary} />
          <StatTile label="Invoices raised" value={String(monthInvoices.length)} accent={theme.colors.accent} />
        </View>
      </SectionCard>
      <SectionCard title="Report details">
        <Text style={styles.infoText}>Payments recorded: {monthPayments.length}</Text>
        <Text style={styles.infoText}>Expenses posted: {monthExpenses.length}</Text>
        <Text style={styles.infoText}>Invoices paid: {monthInvoices.filter((invoice) => invoiceStatus(invoice) === "paid").length}</Text>
        <Text style={styles.infoText}>Invoices pending: {monthInvoices.filter((invoice) => invoiceRemaining(invoice) > 0).length}</Text>
      </SectionCard>
    </>
  );
}

function StaffPane() {
  const { communityData, saveStaffMember, deleteStaffMember } = useApp();
  const staffList = communityData?.staffList ?? [];
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "admin",
    active: true,
    password: ""
  });
  const [busy, setBusy] = useState(false);

  async function onSave() {
    setBusy(true);
    const result = await saveStaffMember(form);
    setBusy(false);
    if (!result.ok) {
      Alert.alert("Could not save staff", result.message);
      return;
    }
    setForm({ name: "", email: "", role: "admin", active: true, password: "" });
  }

  async function onDelete(staffId: string) {
    const result = await deleteStaffMember(staffId);
    if (!result.ok) {
      Alert.alert("Could not delete staff", result.message);
    }
  }

  return (
    <>
      <SectionCard title="Add staff or admin">
        <Field label="Name" value={form.name} onChangeText={(name) => setForm((current) => ({ ...current, name }))} placeholder="Staff member name" />
        <Field label="Email" value={form.email} onChangeText={(email) => setForm((current) => ({ ...current, email }))} placeholder="staff@community.com" autoCapitalize="none" keyboardType="email-address" />
        <Chooser
          label="Role"
          options={[
            { key: "admin", label: "Admin" },
            { key: "staff", label: "Staff" }
          ]}
          active={form.role}
          onSelect={(role) => setForm((current) => ({ ...current, role }))}
        />
        <Chooser
          label="Status"
          options={[
            { key: "active", label: "Active" },
            { key: "inactive", label: "Inactive" }
          ]}
          active={form.active ? "active" : "inactive"}
          onSelect={(status) => setForm((current) => ({ ...current, active: status === "active" }))}
        />
        <Field label="Password" value={form.password} onChangeText={(password) => setForm((current) => ({ ...current, password }))} placeholder="Minimum 8 characters" secureTextEntry />
        <Button title="Save Staff" onPress={() => void onSave()} busy={busy} />
      </SectionCard>

      <SectionCard title="All staff">
        {!staffList.length ? (
          <EmptyState title="No added staff yet" body="New admins and staff members will appear here." />
        ) : (
          <View style={styles.list}>
            {staffList.map((staff) => (
              <View key={staff.id} style={styles.rowCard}>
                <Text style={styles.rowTitle}>{staff.name}</Text>
                <Text style={styles.rowMeta}>{staff.email}</Text>
                <Text style={styles.rowMeta}>Role: {staff.role}</Text>
                <Text style={styles.rowMeta}>Status: {staff.active === false ? "Inactive" : "Active"}</Text>
                <Button title="Delete" onPress={() => void onDelete(staff.id)} tone="ghost" />
              </View>
            ))}
          </View>
        )}
      </SectionCard>
    </>
  );
}

function AmenitiesPane() {
  const { communityData, saveAmenity, deleteAmenity } = useApp();
  const amenities = communityData?.amenities ?? [];
  const bookings = communityData?.amenityBookings ?? [];
  const [form, setForm] = useState({
    name: "",
    instructions: "",
    enabled: true,
    chargesEnabled: false,
    advanceDays: "30",
    slotsText: "Morning|0\nEvening|0"
  });
  const [busy, setBusy] = useState(false);

  async function onSaveAmenity() {
    const slots = form.slotsText
      .split("\n")
      .map((row) => row.trim())
      .filter(Boolean)
      .map((row) => {
        const [label, charge] = row.split("|");
        return { id: "", label: label?.trim() || "", charge: Number(charge || 0) } as AmenitySlot;
      });
    setBusy(true);
    const result = await saveAmenity({
      name: form.name,
      instructions: form.instructions,
      enabled: form.enabled,
      chargesEnabled: form.chargesEnabled,
      advanceDays: Number(form.advanceDays || 30),
      slots
    });
    setBusy(false);
    if (!result.ok) {
      Alert.alert("Could not save amenity", result.message);
      return;
    }
    setForm({
      name: "",
      instructions: "",
      enabled: true,
      chargesEnabled: false,
      advanceDays: "30",
      slotsText: "Morning|0\nEvening|0"
    });
  }

  async function onDeleteAmenity(amenityId: string) {
    const result = await deleteAmenity(amenityId);
    if (!result.ok) {
      Alert.alert("Could not delete amenity", result.message);
    }
  }

  return (
    <>
      <SectionCard title="Add amenity">
        <Field label="Amenity name" value={form.name} onChangeText={(name) => setForm((current) => ({ ...current, name }))} placeholder="Swimming Pool" />
        <Field label="Instructions" value={form.instructions} onChangeText={(instructions) => setForm((current) => ({ ...current, instructions }))} placeholder="Rules for owners" />
        <Chooser
          label="Availability"
          options={[
            { key: "enabled", label: "Enabled" },
            { key: "disabled", label: "Disabled" }
          ]}
          active={form.enabled ? "enabled" : "disabled"}
          onSelect={(status) => setForm((current) => ({ ...current, enabled: status === "enabled" }))}
        />
        <Chooser
          label="Charges"
          options={[
            { key: "free", label: "Free" },
            { key: "paid", label: "Paid" }
          ]}
          active={form.chargesEnabled ? "paid" : "free"}
          onSelect={(mode) => setForm((current) => ({ ...current, chargesEnabled: mode === "paid" }))}
        />
        <Field label="Advance days" value={form.advanceDays} onChangeText={(advanceDays) => setForm((current) => ({ ...current, advanceDays }))} placeholder="30" keyboardType="numeric" />
        <Field label="Slots (one per line: Label|Charge)" value={form.slotsText} onChangeText={(slotsText) => setForm((current) => ({ ...current, slotsText }))} placeholder="Morning|0" multiline />
        <Button title="Save Amenity" onPress={() => void onSaveAmenity()} busy={busy} />
      </SectionCard>

      <SectionCard title="Amenities">
        {!amenities.length ? (
          <EmptyState title="No amenities yet" body="Added amenities will appear here." />
        ) : (
          <View style={styles.list}>
            {amenities.map((amenity) => (
              <View key={amenity.id} style={styles.rowCard}>
                <Text style={styles.rowTitle}>{amenity.name}</Text>
                <Text style={styles.rowMeta}>{amenity.instructions || "No instructions"}</Text>
                <Text style={styles.rowMeta}>Status: {amenity.enabled === false ? "Disabled" : "Enabled"}</Text>
                <Text style={styles.rowMeta}>Type: {amenity.chargesEnabled ? "Paid" : "Free"}</Text>
                <Text style={styles.rowMeta}>Slots: {(amenity.slots ?? []).map((slot) => slot.label).join(", ") || "-"}</Text>
                <Button title="Delete" onPress={() => void onDeleteAmenity(amenity.id)} tone="ghost" />
              </View>
            ))}
          </View>
        )}
      </SectionCard>

      <SectionCard title="Amenity bookings">
        {!bookings.length ? (
          <EmptyState title="No bookings yet" body="Owner amenity bookings will appear here." />
        ) : (
          <View style={styles.list}>
            {bookings
              .slice()
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((booking) => {
                const amenity = amenities.find((item) => item.id === booking.amenityId);
                const slot = amenity?.slots?.find((item) => item.id === booking.slotId);
                return (
                  <View key={booking.id} style={styles.rowCard}>
                    <Text style={styles.rowTitle}>{amenity?.name || "Amenity"}</Text>
                    <Text style={styles.rowMeta}>{booking.ownerName} · {booking.unitNo}</Text>
                    <Text style={styles.rowMeta}>{booking.date} · {slot?.label || "-"}</Text>
                    <Text style={styles.rowMeta}>{booking.amount > 0 ? formatCurrency(booking.amount) : "Free"}</Text>
                    <Text style={styles.rowMeta}>Status: {booking.status}</Text>
                  </View>
                );
              })}
          </View>
        )}
      </SectionCard>
    </>
  );
}

function VisitorsPane() {
  const { communityData, updateVisitorStatus } = useApp();
  const visitors = communityData?.visitors ?? [];
  const pending = visitors.filter((visitor) => visitor.status === "pending").sort((a, b) => a.visitDate.localeCompare(b.visitDate));
  const active = visitors.filter((visitor) => visitor.status === "arrived").sort((a, b) => (b.entryTime || 0) - (a.entryTime || 0));
  const history = visitors.filter((visitor) => ["approved", "rejected", "arrived", "departed"].includes(visitor.status)).sort((a, b) => b.createdAt - a.createdAt);

  async function onUpdate(visitorId: string, status: string) {
    const result = await updateVisitorStatus(visitorId, status);
    if (!result.ok) {
      Alert.alert("Could not update visitor", result.message);
    }
  }

  return (
    <>
      <SectionCard title="Pending approvals">
        {!pending.length ? (
          <EmptyState title="No pending approvals" body="New visitor requests will appear here." />
        ) : (
          <View style={styles.list}>
            {pending.map((visitor) => (
              <View key={visitor.id} style={styles.rowCard}>
                <Text style={styles.rowTitle}>{visitor.visitorName}</Text>
                <Text style={styles.rowMeta}>{visitor.visitorPhone}</Text>
                <Text style={styles.rowMeta}>{visitor.ownerName} · {visitor.unitNo}</Text>
                <Text style={styles.rowMeta}>{visitor.visitDate} · {visitor.purpose || "No purpose"}</Text>
                <Text style={styles.rowMeta}>Pass code: {visitor.passCode}</Text>
                <View style={styles.actionRow}>
                  <Button title="Approve" onPress={() => void onUpdate(visitor.id, "approved")} tone="secondary" />
                  <Button title="Reject" onPress={() => void onUpdate(visitor.id, "rejected")} tone="ghost" />
                </View>
              </View>
            ))}
          </View>
        )}
      </SectionCard>

      <SectionCard title="Active visitors">
        {!active.length ? (
          <EmptyState title="No active visitors" body="Visitors marked as arrived will appear here." />
        ) : (
          <View style={styles.list}>
            {active.map((visitor) => (
              <View key={visitor.id} style={styles.rowCard}>
                <Text style={styles.rowTitle}>{visitor.visitorName}</Text>
                <Text style={styles.rowMeta}>{visitor.ownerName} · {visitor.unitNo}</Text>
                <Text style={styles.rowMeta}>Entry: {visitor.entryTime ? new Date(visitor.entryTime).toLocaleString("en-IN") : "-"}</Text>
                <Button title="Mark Exit" onPress={() => void onUpdate(visitor.id, "departed")} tone="ghost" />
              </View>
            ))}
          </View>
        )}
      </SectionCard>

      <SectionCard title="Visitor history">
        {!history.length ? (
          <EmptyState title="No history yet" body="Approved, rejected, and completed visits will appear here." />
        ) : (
          <View style={styles.list}>
            {history.map((visitor) => (
              <View key={visitor.id} style={styles.rowCard}>
                <Text style={styles.rowTitle}>{visitor.visitorName}</Text>
                <Text style={styles.rowMeta}>{visitor.ownerName} · {visitor.unitNo}</Text>
                <Text style={styles.rowMeta}>{visitor.visitDate}</Text>
                <Text style={styles.rowMeta}>Status: {visitor.status}</Text>
              </View>
            ))}
          </View>
        )}
      </SectionCard>
    </>
  );
}

function VehiclesPane() {
  const { communityData, saveVehicle, deleteVehicle } = useApp();
  const owners = communityData?.owners ?? [];
  const vehicles = communityData?.vehicles ?? [];
  const [form, setForm] = useState({
    ownerId: "",
    number: "",
    type: "Car",
    make: "",
    color: "",
    notes: ""
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!owners.length) return;
    setForm((current) => (current.ownerId ? current : { ...current, ownerId: owners[0].id }));
  }, [owners]);

  async function onSave() {
    setBusy(true);
    const result = await saveVehicle(form);
    setBusy(false);
    if (!result.ok) {
      Alert.alert("Could not save vehicle", result.message);
      return;
    }
    setForm((current) => ({ ...current, number: "", make: "", color: "", notes: "" }));
  }

  async function onDelete(vehicleId: string) {
    const result = await deleteVehicle(vehicleId);
    if (!result.ok) {
      Alert.alert("Could not delete vehicle", result.message);
    }
  }

  return (
    <>
      <SectionCard title="Register vehicle">
        {!owners.length ? (
          <EmptyState title="Add an owner first" body="Vehicle registration becomes available once an owner site exists." />
        ) : (
          <>
            <Chooser
              label="Owner site"
              options={owners.map((owner) => ({ key: owner.id, label: `${owner.name} - ${formatUnit(owner)}` }))}
              active={form.ownerId}
              onSelect={(ownerId) => setForm((current) => ({ ...current, ownerId }))}
            />
            <Field label="Vehicle number" value={form.number} onChangeText={(number) => setForm((current) => ({ ...current, number }))} placeholder="KA01AB1234" autoCapitalize="characters" />
            <Field label="Type" value={form.type} onChangeText={(type) => setForm((current) => ({ ...current, type }))} placeholder="Car" />
            <Field label="Make" value={form.make} onChangeText={(make) => setForm((current) => ({ ...current, make }))} placeholder="Hyundai" />
            <Field label="Color" value={form.color} onChangeText={(color) => setForm((current) => ({ ...current, color }))} placeholder="White" />
            <Field label="Notes" value={form.notes} onChangeText={(notes) => setForm((current) => ({ ...current, notes }))} placeholder="Resident parking slot, EV..." />
            <Button title="Save Vehicle" onPress={() => void onSave()} busy={busy} />
          </>
        )}
      </SectionCard>

      <SectionCard title="Vehicle registry">
        {!vehicles.length ? (
          <EmptyState title="No vehicles yet" body="Registered resident vehicles will appear here." />
        ) : (
          <View style={styles.list}>
            {vehicles.map((vehicle) => {
              const owner = owners.find((item) => item.id === vehicle.ownerId);
              return (
                <View key={vehicle.id} style={styles.rowCard}>
                  <Text style={styles.rowTitle}>{vehicle.number}</Text>
                  <Text style={styles.rowMeta}>{vehicle.type} · {vehicle.make || "Unknown make"} · {vehicle.color || "No color"}</Text>
                  <Text style={styles.rowMeta}>{owner?.name || "Unknown owner"} · {formatUnit(owner)} · {owner?.cross || "-"}</Text>
                  <Text style={styles.rowMeta}>{vehicle.notes || "No notes"}</Text>
                  <Button title="Delete" onPress={() => void onDelete(vehicle.id)} tone="ghost" />
                </View>
              );
            })}
          </View>
        )}
      </SectionCard>
    </>
  );
}

function GatePane() {
  const { communityData, logGateEntry, logGateExit } = useApp();
  const gateLogs = communityData?.gateLogs ?? [];
  const vehicles = communityData?.vehicles ?? [];
  const inside = gateLogs.filter((log) => log.status === "inside").sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime());
  const history = gateLogs.slice().sort((a, b) => b.createdAt - a.createdAt);
  const today = new Date().toDateString();
  const todayLogs = gateLogs.filter((log) => new Date(log.entryTime).toDateString() === today);
  const [entryForm, setEntryForm] = useState({ number: "", visitorName: "", purpose: "Resident" });
  const [exitNumber, setExitNumber] = useState("");
  const [busy, setBusy] = useState(false);

  async function onEntry() {
    setBusy(true);
    const result = await logGateEntry(entryForm);
    setBusy(false);
    if (!result.ok) {
      Alert.alert("Could not log entry", result.message);
      return;
    }
    setEntryForm({ number: "", visitorName: "", purpose: "Resident" });
  }

  async function onExit(number: string) {
    const result = await logGateExit(number);
    if (!result.ok) {
      Alert.alert("Could not log exit", result.message);
      return;
    }
    setExitNumber("");
  }

  return (
    <>
      <SectionCard title="Gate status">
        <View style={styles.statsGrid}>
          <StatTile label="Today's entries" value={String(todayLogs.length)} accent={theme.colors.primary} />
          <StatTile label="Currently inside" value={String(inside.length)} accent={theme.colors.warning} />
        </View>
        <View style={styles.statsGrid}>
          <StatTile label="Exited today" value={String(todayLogs.filter((log) => log.status === "exited").length)} accent={theme.colors.success} />
          <StatTile label="Registered vehicles" value={String(vehicles.length)} accent={theme.colors.accent} />
        </View>
      </SectionCard>

      <SectionCard title="Log entry">
        <Field label="Vehicle number" value={entryForm.number} onChangeText={(number) => setEntryForm((current) => ({ ...current, number }))} placeholder="KA01AB1234" autoCapitalize="characters" />
        <Field label="Visitor name (optional)" value={entryForm.visitorName} onChangeText={(visitorName) => setEntryForm((current) => ({ ...current, visitorName }))} placeholder="Guest name" />
        <Field label="Purpose" value={entryForm.purpose} onChangeText={(purpose) => setEntryForm((current) => ({ ...current, purpose }))} placeholder="Resident / Delivery / Guest" />
        <Button title="Log Entry" onPress={() => void onEntry()} busy={busy} />
      </SectionCard>

      <SectionCard title="Log exit">
        <Field label="Vehicle number" value={exitNumber} onChangeText={setExitNumber} placeholder="KA01AB1234" autoCapitalize="characters" />
        <Button title="Log Exit" onPress={() => void onExit(exitNumber)} />
      </SectionCard>

      <SectionCard title="Currently inside">
        {!inside.length ? (
          <EmptyState title="No vehicles inside" body="Vehicles currently inside the community will appear here." />
        ) : (
          <View style={styles.list}>
            {inside.map((log) => (
              <View key={log.id} style={styles.rowCard}>
                <Text style={styles.rowTitle}>{log.number}</Text>
                <Text style={styles.rowMeta}>{log.ownerName} · {log.ownerSite}</Text>
                <Text style={styles.rowMeta}>{log.vehType || "-"} · {log.purpose}</Text>
                <Text style={styles.rowMeta}>Entry: {new Date(log.entryTime).toLocaleString("en-IN")}</Text>
                <Button title="Exit" onPress={() => void onExit(log.number)} tone="ghost" />
              </View>
            ))}
          </View>
        )}
      </SectionCard>

      <SectionCard title="Gate history">
        {!history.length ? (
          <EmptyState title="No gate history yet" body="Gate entries and exits will appear here." />
        ) : (
          <View style={styles.list}>
            {history.map((log) => (
              <View key={log.id} style={styles.rowCard}>
                <Text style={styles.rowTitle}>{log.number}</Text>
                <Text style={styles.rowMeta}>{log.ownerName} · {log.ownerSite}</Text>
                <Text style={styles.rowMeta}>Entry: {new Date(log.entryTime).toLocaleString("en-IN")}</Text>
                <Text style={styles.rowMeta}>Exit: {log.exitTime ? new Date(log.exitTime).toLocaleString("en-IN") : "-"}</Text>
                <Text style={styles.rowMeta}>Status: {log.status}</Text>
              </View>
            ))}
          </View>
        )}
      </SectionCard>
    </>
  );
}

function HighlightCard({ title, value, meta }: { title: string; value: string; meta: string }) {
  return (
    <View style={styles.highlightCard}>
      <Text style={styles.highlightTitle}>{title}</Text>
      <Text style={styles.highlightValue}>{value}</Text>
      <Text style={styles.highlightMeta}>{meta}</Text>
    </View>
  );
}

function Chooser({
  label,
  options,
  active,
  onSelect
}: {
  label: string;
  options: { key: string; label: string }[];
  active: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Label>{label}</Label>
      <View style={styles.pillRow}>
        {options.map((option) => (
          <Pressable
            key={option.key}
            onPress={() => onSelect(option.key)}
            style={[styles.choicePill, active === option.key && styles.choicePillActive]}
          >
            <Text style={[styles.choicePillText, active === option.key && styles.choicePillTextActive]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  autoCapitalize,
  keyboardType,
  secureTextEntry,
  multiline
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  autoCapitalize?: "none" | "characters" | "words" | "sentences";
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  secureTextEntry?: boolean;
  multiline?: boolean;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Label>{label}</Label>
      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        style={multiline ? styles.multilineInput : undefined}
      />
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Text
      style={[
        styles.badge,
        status === "paid" && styles.badgePaid,
        status === "pending" && styles.badgePending,
        status === "overdue" && styles.badgeOverdue,
        status === "partial" && styles.badgePartial
      ]}
    >
      {status}
    </Text>
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatUnit(owner?: Partial<Owner>) {
  return owner?.house || owner?.siteNo || owner?.flatNo || owner?.houseNo || owner?.unitNo || "Unit not assigned";
}

const styles = StyleSheet.create({
  statsGrid: {
    flexDirection: "row",
    gap: 12
  },
  fieldWrap: {
    gap: 8
  },
  inlineFields: {
    flexDirection: "row",
    gap: 12
  },
  inlineField: {
    flex: 1
  },
  infoText: {
    color: theme.colors.inkMuted,
    lineHeight: 21
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  choicePill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "#f8fbff",
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  choicePillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary
  },
  choicePillText: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: "700"
  },
  choicePillTextActive: {
    color: "#fff"
  },
  highlightGrid: {
    gap: 12
  },
  highlightCard: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#f8fbff",
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6
  },
  highlightTitle: {
    color: theme.colors.inkMuted,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  highlightValue: {
    color: theme.colors.ink,
    fontSize: 22,
    fontWeight: "800"
  },
  highlightMeta: {
    color: theme.colors.inkMuted,
    lineHeight: 20
  },
  list: {
    gap: 12
  },
  rowCard: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#f9fbff",
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 6
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12
  },
  rowTitle: {
    color: theme.colors.ink,
    fontSize: 17,
    fontWeight: "700"
  },
  rowMeta: {
    color: theme.colors.inkMuted,
    lineHeight: 20
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    overflow: "hidden",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize"
  },
  badgePaid: {
    color: theme.colors.success,
    backgroundColor: "#ddfbe5"
  },
  badgePending: {
    color: "#8a5a00",
    backgroundColor: "#fff1cf"
  },
  badgeOverdue: {
    color: theme.colors.danger,
    backgroundColor: "#fee2e2"
  },
  badgePartial: {
    color: "#0f766e",
    backgroundColor: "#ccfbf1"
  },
  actionRow: {
    flexDirection: "row",
    gap: 12
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: "top"
  }
});

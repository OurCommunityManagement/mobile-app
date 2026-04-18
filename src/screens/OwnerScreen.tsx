import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { useApp } from "../context/AppContext";
import { Button, EmptyState, Input, Label, SectionCard, StatTile } from "../components/ui";
import { RoleShell } from "../components/role-shell";
import { startRazorpayCheckout } from "../services/razorpay";
import { theme } from "../theme";
import { formatCurrency, invoiceRemaining, invoiceStatus, monthName } from "../utils/format";
import type { Invoice, Payment } from "../types/models";

const tabs = [
  "home",
  "info",
  "visitors",
  "dues",
  "payments",
  "receipts",
  "profile",
  "password",
  "amenities"
] as const;

type Tab = (typeof tabs)[number];

export function OwnerScreen() {
  const {
    activeCommunity,
    communityData,
    session,
    logout,
    refresh,
    refreshing,
    updateOwnerProfile,
    changeOwnerPassword,
    payOwnerInvoice,
    bookAmenity,
    cancelAmenityBooking,
    registerVisitor
  } = useApp();
  const [tab, setTab] = useState<Tab>("home");
  const [profileForm, setProfileForm] = useState({ name: "", email: "", mobile: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", nextPassword: "", confirmPassword: "" });
  const [paymentForm, setPaymentForm] = useState({ invoiceId: "", mode: "UPI", date: today(), reference: "" });
  const [amenityDate, setAmenityDate] = useState(today());
  const [selectedSlots, setSelectedSlots] = useState<Record<string, string>>({});
  const [visitorForm, setVisitorForm] = useState({ visitorName: "", visitorPhone: "", visitDate: today(), purpose: "" });
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);

  const ownerRecords = useMemo(
    () =>
      (communityData?.owners ?? []).filter(
        (owner) => owner.email.toLowerCase() === session?.email?.toLowerCase()
      ),
    [communityData?.owners, session?.email]
  );
  const primaryOwner = ownerRecords[0];
  const ownerIds = ownerRecords.map((owner) => owner.id);
  const invoices = (communityData?.invoices ?? []).filter((invoice) => ownerIds.includes(invoice.ownerId));
  const payments = (communityData?.payments ?? []).filter((payment) => ownerIds.includes(payment.ownerId));
  const pendingInvoices = invoices
    .filter((invoice) => invoiceRemaining(invoice) > 0)
    .slice()
    .sort((a, b) => (b.year - a.year) || (b.month - a.month));
  const paidInvoices = invoices
    .filter((invoice) => invoice.status === "paid" || invoiceRemaining(invoice) <= 0)
    .slice()
    .sort((a, b) => (b.year - a.year) || (b.month - a.month));
  const ownerBookings = (communityData?.amenityBookings ?? [])
    .filter((booking) => booking.ownerEmail.toLowerCase() === session?.email?.toLowerCase())
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt);
  const ownerVisitors = (communityData?.visitors ?? [])
    .filter((visitor) => visitor.ownerEmail.toLowerCase() === session?.email?.toLowerCase())
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt);
  const amenities = (communityData?.amenities ?? []).filter((amenity) => amenity.enabled !== false);

  useEffect(() => {
    if (primaryOwner) {
      setProfileForm({
        name: primaryOwner.name || "",
        email: primaryOwner.email || "",
        mobile: primaryOwner.mobile || ""
      });
    }
  }, [primaryOwner?.name, primaryOwner?.email, primaryOwner?.mobile]);

  useEffect(() => {
    if (!pendingInvoices.length) {
      setPaymentForm((current) => (current.invoiceId ? { ...current, invoiceId: "" } : current));
      return;
    }

    const selectedStillExists = pendingInvoices.some((invoice) => invoice.id === paymentForm.invoiceId);
    if (!selectedStillExists) {
      setPaymentForm((current) => ({
        ...current,
        invoiceId: pendingInvoices[0].id
      }));
    }
  }, [pendingInvoices, paymentForm.invoiceId]);

  async function submitProfile() {
    const result = await updateOwnerProfile(profileForm);
    if (!result.ok) {
      Alert.alert("Profile update failed", result.message);
      return;
    }
    Alert.alert("Profile updated", "Your profile details were updated across your owner records.");
  }

  async function submitPassword() {
    const result = await changeOwnerPassword(
      passwordForm.currentPassword,
      passwordForm.nextPassword,
      passwordForm.confirmPassword
    );
    if (!result.ok) {
      Alert.alert("Password change failed", result.message);
      return;
    }
    setPasswordForm({ currentPassword: "", nextPassword: "", confirmPassword: "" });
    Alert.alert("Password updated", "Your owner password has been changed.");
  }

  async function submitPayment() {
    const result = await payOwnerInvoice(paymentForm);
    if (!result.ok) {
      Alert.alert("Payment failed", result.message);
      return;
    }
    setPaymentForm({ invoiceId: "", mode: "UPI", date: today(), reference: "" });
    Alert.alert("Payment recorded", "Your payment was recorded and the invoice was marked paid.");
  }

  async function submitRazorpayPayment(invoice?: Invoice) {
    const targetInvoice = invoice ?? selectedInvoice ?? pendingInvoices[0];
    if (!targetInvoice) {
      Alert.alert("No invoice selected", "Choose a due invoice to continue with payment.");
      return;
    }

    const owner = ownerRecords.find((item) => item.id === targetInvoice.ownerId) ?? primaryOwner;
    if (!owner || !activeCommunity?.id) {
      Alert.alert("Payment unavailable", "Owner or community details are missing for this invoice.");
      return;
    }

    const remaining = invoiceRemaining(targetInvoice);
    if (remaining <= 0) {
      Alert.alert("Already paid", "This invoice has already been cleared.");
      return;
    }

    const periodLabel =
      targetInvoice.freq === "yearly"
        ? `Year ${targetInvoice.year}`
        : `${monthName(targetInvoice.month)} ${targetInvoice.year}`;

    setPayingInvoiceId(targetInvoice.id);
    try {
      const payment = await startRazorpayCheckout({
        amount: remaining,
        invoiceId: targetInvoice.id,
        ownerId: owner.id,
        communityId: activeCommunity.id,
        ownerName: owner.name || session?.email || "Resident",
        ownerEmail: owner.email || session?.email || "",
        ownerMobile: owner.mobile,
        communityName: activeCommunity.name || "Community Portal",
        periodLabel
      });

      const result = await payOwnerInvoice({
        invoiceId: targetInvoice.id,
        mode: "razorpay",
        date: today(),
        reference: `Razorpay ${payment.razorpay_payment_id}`,
        gatewayPaymentId: payment.razorpay_payment_id,
        gatewayOrderId: payment.razorpay_order_id || ""
      });

      if (!result.ok) {
        Alert.alert("Payment captured but not recorded", result.message);
        return;
      }

      setPaymentForm((current) => ({
        ...current,
        invoiceId: targetInvoice.id
      }));
      Alert.alert("Payment successful", `Paid ${formatCurrency(remaining)} for ${periodLabel}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to complete payment.";
      if (message.toLowerCase().includes("cancel")) {
        Alert.alert("Payment cancelled", "You can retry payment any time.");
      } else {
        Alert.alert("Payment failed", message);
      }
    } finally {
      setPayingInvoiceId(null);
    }
  }

  async function submitAmenity(amenityId: string) {
    const slotId = selectedSlots[amenityId];
    const result = await bookAmenity(amenityId, slotId, amenityDate);
    if (!result.ok) {
      Alert.alert("Booking failed", result.message);
      return;
    }
    Alert.alert("Amenity booked", "Your booking is confirmed.");
  }

  async function submitVisitor() {
    const result = await registerVisitor(visitorForm);
    if (!result.ok) {
      Alert.alert("Visitor registration failed", result.message);
      return;
    }
    setVisitorForm({ visitorName: "", visitorPhone: "", visitDate: today(), purpose: "" });
    Alert.alert("Visitor registered", `Pass code: ${result.passCode}`);
  }

  async function onCancelBooking(bookingId: string) {
    const result = await cancelAmenityBooking(bookingId);
    if (!result.ok) {
      Alert.alert("Cancellation failed", result.message);
      return;
    }
    Alert.alert("Booking cancelled", "The amenity booking was cancelled.");
  }

  async function shareReceipt(invoice: Invoice, payment?: Payment) {
    const receiptNo = `RCPT-${invoice.id.slice(-6).toUpperCase()}`;
    const lines = [
      `Receipt No: ${receiptNo}`,
      `Community: ${activeCommunity?.name || "-"}`,
      `Owner: ${primaryOwner?.name || "-"}`,
      `Unit: ${formatUnit(primaryOwner)}`,
      `Period: ${invoice.freq === "yearly" ? `Year ${invoice.year}` : `${monthName(invoice.month)} ${invoice.year}`}`,
      `Paid On: ${invoice.paidDate || "-"}`,
      `Payment Mode: ${payment?.mode || "-"}`,
      `Amount Paid: ${formatCurrency((invoice.amount || 0) + (invoice.penalty || 0))}`
    ];

    await Share.share({
      message: lines.join("\n")
    });
  }

  const selectedInvoice = pendingInvoices.find((invoice) => invoice.id === paymentForm.invoiceId);
  const totalDue = pendingInvoices.reduce((sum, invoice) => sum + invoiceRemaining(invoice), 0);
  const overdueCount = pendingInvoices.filter((invoice) => invoiceStatus(invoice) === "overdue").length;
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <RoleShell
      title={activeCommunity?.name ?? "Our Community"}
      subtitle={primaryOwner?.name ?? session?.email ?? "Community member"}
      accentColors={["#10233f", "#2563eb"]}
      navItems={[
        { key: "home", label: "Home" },
        { key: "info", label: "My Info" },
        { key: "visitors", label: "Visitors" },
        { key: "dues", label: "Dues" },
        { key: "payments", label: "Payments" },
        { key: "receipts", label: "Receipts" },
        { key: "profile", label: "Edit Profile" },
        { key: "password", label: "Password" },
        { key: "amenities", label: "Amenities" }
      ]}
      activeTab={tab}
      onSelectTab={setTab}
      actions={
        <View style={styles.headerActions}>
          <Button title="Refresh" onPress={() => void refresh()} tone="ghost" size="sm" busy={refreshing} />
          <Button title="Logout" onPress={() => void logout()} tone="secondary" size="sm" />
        </View>
      }
    >
      {tab === "home" ? (
        <>
          <SectionCard title="Your summary">
            <View style={styles.statsRow}>
              <StatTile
                label="Pending dues"
                value={formatCurrency(totalDue)}
                accent={theme.colors.danger}
              />
              <StatTile
                label="Total paid"
                value={formatCurrency(totalPaid)}
                accent={theme.colors.success}
              />
            </View>
            <Button
              title="Pay Now"
              onPress={() => void submitRazorpayPayment()}
              tone="primary"
              disabled={!pendingInvoices.length}
              busy={payingInvoiceId !== null}
            />
          </SectionCard>
          <SectionCard title="Community snapshot">
            <Text style={styles.infoText}>Track dues, payment history, receipts, amenities, visitors, and your profile details in one place.</Text>
            <View style={styles.homeCard}>
              <Text style={styles.homeTitle}>{formatUnit(primaryOwner)}</Text>
              <Text style={styles.homeMeta}>{primaryOwner?.cross || "Cross not assigned"} · {activeCommunity?.name || "Community"}</Text>
              <Text style={styles.homeMeta}>{pendingInvoices.length} pending dues · {ownerBookings.length} amenity bookings · {ownerVisitors.length} visitors</Text>
            </View>
          </SectionCard>
        </>
      ) : null}

      {tab === "info" ? (
        <SectionCard title="My info">
          {!ownerRecords.length ? (
            <EmptyState title="No owner records found" body="Your owner details will appear here once they exist in the community." />
          ) : (
            <View style={styles.list}>
              <View style={styles.rowCard}>
                <Text style={styles.rowTitle}>{primaryOwner?.name || "-"}</Text>
                <Text style={styles.rowMeta}>{primaryOwner?.email || "-"}</Text>
                <Text style={styles.rowMeta}>{primaryOwner?.mobile || "Mobile not set"}</Text>
              </View>
              {ownerRecords.map((owner, index) => (
                <View key={owner.id} style={styles.rowCard}>
                  <Text style={styles.rowTitle}>Site {index + 1}</Text>
                  <Text style={styles.rowMeta}>Cross: {owner.cross || "-"}</Text>
                  <Text style={styles.rowMeta}>Unit: {formatUnit(owner)}</Text>
                  <Text style={styles.rowMeta}>Flats: {String(owner.flats ?? 0)}</Text>
                  <Text style={styles.rowMeta}>Status: {owner.status || "-"}</Text>
                </View>
              ))}
            </View>
          )}
        </SectionCard>
      ) : null}

      {tab === "dues" ? (
        <>
          <SectionCard title="Dues snapshot">
            <View style={styles.statsGrid}>
              <StatTile label="Total due" value={formatCurrency(totalDue)} accent={theme.colors.danger} />
              <StatTile label="Invoices pending" value={String(pendingInvoices.length)} accent={theme.colors.warning} />
            </View>
            <View style={styles.statsGrid}>
              <StatTile label="Overdue" value={String(overdueCount)} accent={theme.colors.danger} />
              <StatTile label="Total paid" value={formatCurrency(totalPaid)} accent={theme.colors.success} />
            </View>
          </SectionCard>

          <SectionCard title="Current dues">
            {!pendingInvoices.length ? (
              <EmptyState title="No pending dues" body="You’re all caught up. New invoice balances will appear here." />
            ) : (
              <View style={styles.list}>
                {pendingInvoices.map((invoice) => (
                  <InvoiceCard
                    key={invoice.id}
                    invoice={invoice}
                    owner={ownerRecords.find((owner) => owner.id === invoice.ownerId)}
                    busy={payingInvoiceId === invoice.id}
                    onPress={() =>
                      setPaymentForm({
                        invoiceId: invoice.id,
                        mode: "UPI",
                        date: today(),
                        reference: ""
                      })
                    }
                    onPayNow={() => void submitRazorpayPayment(invoice)}
                  />
                ))}
              </View>
            )}
          </SectionCard>

          {pendingInvoices.length ? (
            <SectionCard title="Pay selected invoice">
              {selectedInvoice ? (
                <View style={styles.paymentHighlight}>
                  <Text style={styles.paymentHighlightTitle}>
                    {selectedInvoice.freq === "yearly"
                      ? `Year ${selectedInvoice.year}`
                      : `${monthName(selectedInvoice.month)} ${selectedInvoice.year}`}
                  </Text>
                  <Text style={styles.paymentHighlightMeta}>
                    Due date: {selectedInvoice.dueDate || "Not set"}
                  </Text>
                  <Text style={styles.paymentHighlightMeta}>
                    Status: {invoiceStatus(selectedInvoice)}
                  </Text>
                  <Text style={styles.paymentHighlightAmount}>
                    {formatCurrency(invoiceRemaining(selectedInvoice))}
                  </Text>
                </View>
              ) : null}
              <View style={styles.fieldWrap}>
                <Label>Invoice</Label>
                <View style={styles.pillRow}>
                  {pendingInvoices.map((invoice) => (
                    <Pressable
                      key={invoice.id}
                      onPress={() =>
                        setPaymentForm((current) => ({
                          ...current,
                          invoiceId: invoice.id
                        }))
                      }
                      style={[
                        styles.choicePill,
                        paymentForm.invoiceId === invoice.id && styles.choicePillActive
                      ]}
                    >
                      <Text
                        style={[
                          styles.choicePillText,
                          paymentForm.invoiceId === invoice.id && styles.choicePillTextActive
                        ]}
                      >
                        {invoice.freq === "yearly" ? `Year ${invoice.year}` : `${monthName(invoice.month)} ${invoice.year}`}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={styles.fieldWrap}>
                <Label>Payment mode</Label>
                <View style={styles.pillRow}>
                  {["Cash", "UPI", "Bank Transfer", "Cheque", "Online"].map((mode) => (
                    <Pressable
                      key={mode}
                      onPress={() => setPaymentForm((current) => ({ ...current, mode }))}
                      style={[styles.choicePill, paymentForm.mode === mode && styles.choicePillActive]}
                    >
                      <Text
                        style={[
                          styles.choicePillText,
                          paymentForm.mode === mode && styles.choicePillTextActive
                        ]}
                      >
                        {mode}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={styles.fieldWrap}>
                <Label>Payment date</Label>
                <Input value={paymentForm.date} onChangeText={(date) => setPaymentForm((current) => ({ ...current, date }))} placeholder="YYYY-MM-DD" />
              </View>
              <View style={styles.fieldWrap}>
                <Label>Reference / transaction ID</Label>
                <Input value={paymentForm.reference} onChangeText={(reference) => setPaymentForm((current) => ({ ...current, reference }))} placeholder="UPI ref, cheque no., etc." />
              </View>
              <Text style={styles.helperText}>
                Online payment uses Razorpay checkout and records the paid invoice immediately after success.
              </Text>
              <View style={styles.paymentActions}>
                <Button
                  title="Pay Now with Razorpay"
                  onPress={() => void submitRazorpayPayment(selectedInvoice)}
                  disabled={!paymentForm.invoiceId}
                  busy={payingInvoiceId === paymentForm.invoiceId}
                />
                <Button title="Confirm Manual Payment" onPress={() => void submitPayment()} disabled={!paymentForm.invoiceId} tone="secondary" />
              </View>
            </SectionCard>
          ) : null}
        </>
      ) : null}

      {tab === "payments" ? (
        <SectionCard title="Payment history">
          {!payments.length ? (
            <EmptyState title="No payment history" body="Payments recorded in the portal will appear here." />
          ) : (
            <View style={styles.list}>
              {payments
                .slice()
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((payment, index) => {
                  const owner = ownerRecords.find((item) => item.id === payment.ownerId);
                  return (
                  <View key={payment.id} style={styles.rowCard}>
                    <Text style={styles.rowTitle}>Payment #{index + 1}</Text>
                    <Text style={styles.rowMeta}>
                      {monthName(payment.month)} {payment.year}
                    </Text>
                    <Text style={styles.rowMeta}>Site: {formatUnit(owner)} · {owner?.cross || "-"}</Text>
                    <Text style={styles.rowMeta}>Amount: {formatCurrency(payment.amount)}</Text>
                    <Text style={styles.rowMeta}>{monthName(payment.month)} {payment.year}</Text>
                    <Text style={styles.rowMeta}>{payment.date} · {payment.mode || "Recorded payment"}</Text>
                    <Text style={styles.rowMeta}>{payment.notes || "No reference"}</Text>
                  </View>
                  );
                })}
            </View>
          )}
        </SectionCard>
      ) : null}

      {tab === "receipts" ? (
        <SectionCard title="Receipts">
          {!paidInvoices.length ? (
            <EmptyState title="No receipts yet" body="Paid invoice receipts will appear here." />
          ) : (
            <View style={styles.list}>
              {paidInvoices.map((invoice) => {
                const payment = payments.find((item) => item.id === invoice.paymentId);
                const owner = ownerRecords.find((item) => item.id === invoice.ownerId);
                return (
                  <View key={invoice.id} style={styles.receiptCard}>
                    <View style={styles.receiptHeader}>
                      <View>
                        <Text style={styles.rowTitle}>Receipt {invoice.id.slice(-6).toUpperCase()}</Text>
                        <Text style={styles.receiptBadge}>PAID</Text>
                      </View>
                      <Button title="Share" onPress={() => void shareReceipt(invoice, payment)} tone="ghost" />
                    </View>
                    <Text style={styles.rowMeta}>
                      {invoice.freq === "yearly" ? `Year ${invoice.year}` : `${monthName(invoice.month)} ${invoice.year}`}
                    </Text>
                    <Text style={styles.rowMeta}>Community: {activeCommunity?.name || "-"}</Text>
                    <Text style={styles.rowMeta}>Site: {formatUnit(owner)} · {owner?.cross || "-"}</Text>
                    <Text style={styles.rowMeta}>Paid on: {invoice.paidDate || "-"}</Text>
                    <Text style={styles.rowMeta}>Mode: {payment?.mode || "-"}</Text>
                    <Text style={styles.rowMeta}>Reference: {payment?.notes || "No reference"}</Text>
                    <Text style={styles.rowMeta}>
                      Total paid: {formatCurrency((invoice.amount || 0) + (invoice.penalty || 0))}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </SectionCard>
      ) : null}

      {tab === "profile" ? (
        <SectionCard title="Edit profile">
          <View style={styles.fieldWrap}>
            <Label>Owner name</Label>
            <Input value={profileForm.name} onChangeText={(name) => setProfileForm((current) => ({ ...current, name }))} placeholder="Full name" />
          </View>
          <View style={styles.fieldWrap}>
            <Label>Mobile number</Label>
            <Input value={profileForm.mobile} onChangeText={(mobile) => setProfileForm((current) => ({ ...current, mobile }))} placeholder="Mobile number" />
          </View>
          <View style={styles.fieldWrap}>
            <Label>Email</Label>
            <Input autoCapitalize="none" keyboardType="email-address" value={profileForm.email} onChangeText={(email) => setProfileForm((current) => ({ ...current, email }))} placeholder="Email" />
          </View>
          <Button title="Save Changes" onPress={() => void submitProfile()} />
        </SectionCard>
      ) : null}

      {tab === "password" ? (
        <SectionCard title="Change password">
          <View style={styles.fieldWrap}>
            <Label>Current password</Label>
            <Input secureTextEntry value={passwordForm.currentPassword} onChangeText={(currentPassword) => setPasswordForm((current) => ({ ...current, currentPassword }))} placeholder="Current password" />
          </View>
          <View style={styles.fieldWrap}>
            <Label>New password</Label>
            <Input secureTextEntry value={passwordForm.nextPassword} onChangeText={(nextPassword) => setPasswordForm((current) => ({ ...current, nextPassword }))} placeholder="Minimum 8 characters" />
          </View>
          <View style={styles.fieldWrap}>
            <Label>Confirm new password</Label>
            <Input secureTextEntry value={passwordForm.confirmPassword} onChangeText={(confirmPassword) => setPasswordForm((current) => ({ ...current, confirmPassword }))} placeholder="Repeat password" />
          </View>
          <Button title="Update Password" onPress={() => void submitPassword()} />
        </SectionCard>
      ) : null}

      {tab === "amenities" ? (
        <>
          <SectionCard title="Book amenity">
            <View style={styles.fieldWrap}>
              <Label>Select date</Label>
              <Input value={amenityDate} onChangeText={setAmenityDate} placeholder="YYYY-MM-DD" />
            </View>
            {!amenities.length ? (
              <EmptyState title="No amenities available" body="Once your community enables amenities, they will appear here." />
            ) : (
              <View style={styles.list}>
                {amenities.map((amenity) => {
                  const slots = amenity.slots ?? [];
                  const booked = ownerBookings.find(
                    (booking) =>
                      booking.amenityId === amenity.id &&
                      booking.date === amenityDate &&
                      booking.status === "confirmed"
                  );
                  const maxBookingDate = addDays(today(), amenity.advanceDays || 30);
                  const tooFar = amenityDate > maxBookingDate;
                  return (
                    <View key={amenity.id} style={styles.rowCard}>
                      <Text style={styles.rowTitle}>{amenity.name}</Text>
                      <Text style={styles.rowMeta}>{amenity.instructions || "No instructions"}</Text>
                      <Text style={styles.rowMeta}>{amenity.chargesEnabled ? "Paid amenity" : "Free amenity"}</Text>
                      {tooFar ? (
                        <Text style={styles.warningText}>
                          Booking is allowed only up to {amenity.advanceDays || 30} days in advance.
                        </Text>
                      ) : booked ? (
                        <Text style={styles.successText}>Already booked for this date.</Text>
                      ) : (
                        <>
                          <View style={styles.pillRow}>
                            {slots.map((slot) => (
                              <Pressable
                                key={slot.id}
                                onPress={() =>
                                  setSelectedSlots((current) => ({
                                    ...current,
                                    [amenity.id]: slot.id
                                  }))
                                }
                                style={[
                                  styles.choicePill,
                                  selectedSlots[amenity.id] === slot.id && styles.choicePillActive
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.choicePillText,
                                    selectedSlots[amenity.id] === slot.id && styles.choicePillTextActive
                                  ]}
                                >
                                  {slot.label}
                                  {amenity.chargesEnabled ? ` · ${formatCurrency(slot.charge || 0)}` : ""}
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                          <Button title="Book Now" onPress={() => void submitAmenity(amenity.id)} disabled={!selectedSlots[amenity.id]} />
                        </>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </SectionCard>

          <SectionCard title="My bookings">
            {!ownerBookings.length ? (
              <EmptyState title="No bookings yet" body="Your amenity bookings will appear here." />
            ) : (
              <View style={styles.list}>
                {ownerBookings.map((booking) => {
                  const amenity = amenities.find((item) => item.id === booking.amenityId);
                  const slot = amenity?.slots?.find((item) => item.id === booking.slotId);
                  const isPast = booking.date < today();
                  return (
                    <View key={booking.id} style={styles.rowCard}>
                      <Text style={styles.rowTitle}>{amenity?.name || "Amenity"}</Text>
                      <Text style={styles.rowMeta}>{booking.date} · {slot?.label || "-"}</Text>
                      <Text style={styles.rowMeta}>{booking.amount > 0 ? formatCurrency(booking.amount) : "Free"}</Text>
                      <Text style={styles.rowMeta}>Status: {booking.status === "confirmed" && isPast ? "completed" : booking.status}</Text>
                      {booking.status === "confirmed" && !isPast ? (
                        <Button title="Cancel Booking" onPress={() => void onCancelBooking(booking.id)} tone="ghost" />
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}
          </SectionCard>
        </>
      ) : null}

      {tab === "visitors" ? (
        <>
          <SectionCard title="Register visitor">
            <View style={styles.fieldWrap}>
              <Label>Visitor name</Label>
              <Input value={visitorForm.visitorName} onChangeText={(visitorName) => setVisitorForm((current) => ({ ...current, visitorName }))} placeholder="Full name" />
            </View>
            <View style={styles.fieldWrap}>
              <Label>Visitor phone</Label>
              <Input value={visitorForm.visitorPhone} onChangeText={(visitorPhone) => setVisitorForm((current) => ({ ...current, visitorPhone }))} placeholder="Mobile number" />
            </View>
            <View style={styles.fieldWrap}>
              <Label>Visit date</Label>
              <Input value={visitorForm.visitDate} onChangeText={(visitDate) => setVisitorForm((current) => ({ ...current, visitDate }))} placeholder="YYYY-MM-DD" />
            </View>
            <View style={styles.fieldWrap}>
              <Label>Purpose of visit</Label>
              <Input value={visitorForm.purpose} onChangeText={(purpose) => setVisitorForm((current) => ({ ...current, purpose }))} placeholder="Personal visit, delivery, etc." />
            </View>
            <Button title="Submit Request" onPress={() => void submitVisitor()} />
          </SectionCard>

          <SectionCard title="My visitors">
            {!ownerVisitors.length ? (
              <EmptyState title="No visitors registered yet" body="Your visitor requests will appear here." />
            ) : (
              <View style={styles.list}>
                {ownerVisitors.map((visitor) => (
                  <View key={visitor.id} style={styles.rowCard}>
                    <Text style={styles.rowTitle}>{visitor.visitorName}</Text>
                    <Text style={styles.rowMeta}>{visitor.visitorPhone}</Text>
                    <Text style={styles.rowMeta}>{visitor.visitDate} · {visitor.purpose || "No purpose"}</Text>
                    <Text style={styles.passCodeText}>Pass code: {visitor.passCode}</Text>
                    <Text style={styles.rowMeta}>Status: {formatVisitorStatus(visitor.status)}</Text>
                  </View>
                ))}
              </View>
            )}
          </SectionCard>
        </>
      ) : null}
    </RoleShell>
  );
}

function InvoiceCard({
  invoice,
  owner,
  busy,
  onPress,
  onPayNow
}: {
  invoice: Invoice;
  owner?: { cross?: string; house?: string; siteNo?: string; flatNo?: string; houseNo?: string; unitNo?: string };
  busy?: boolean;
  onPress: () => void;
  onPayNow: () => void;
}) {
  const status = invoiceStatus(invoice);
  const total = (invoice.amount || 0) + (invoice.penalty || 0);
  const remaining = invoiceRemaining(invoice);
  return (
    <Pressable onPress={onPress} style={styles.rowCard}>
      <Text style={styles.rowTitle}>
        {invoice.freq === "yearly" ? `Year ${invoice.year}` : `${monthName(invoice.month)} ${invoice.year}`}
      </Text>
      <Text style={styles.rowMeta}>Site: {formatUnit(owner)} · {owner?.cross || "-"}</Text>
      <Text style={styles.rowMeta}>Status: {status}</Text>
      <Text style={styles.rowMeta}>Due date: {invoice.dueDate || "Not set"}</Text>
      <Text style={styles.rowMeta}>Total payable: {formatCurrency(total)}</Text>
      <Text style={styles.rowMeta}>Remaining: {formatCurrency(remaining)}</Text>
      <Button title="Pay Now" onPress={onPayNow} busy={busy} />
    </Pressable>
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateString: string, days: number) {
  const next = new Date(dateString);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function formatUnit(owner?: {
  house?: string;
  siteNo?: string;
  flatNo?: string;
  houseNo?: string;
  unitNo?: string;
}) {
  return owner?.house || owner?.siteNo || owner?.flatNo || owner?.houseNo || owner?.unitNo || "Unit not assigned";
}

function formatVisitorStatus(status: string) {
  const labelMap: Record<string, string> = {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    arrived: "Arrived",
    departed: "Departed"
  };
  return labelMap[status] || status;
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: "row",
    gap: 12
  },
  headerActions: {
    flexDirection: "row",
    gap: 10
  },
  paymentActions: {
    gap: 10
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12
  },
  fieldWrap: {
    gap: 8
  },
  infoText: {
    color: theme.colors.inkMuted,
    lineHeight: 21
  },
  homeCard: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#f1fcf4",
    borderWidth: 1,
    borderColor: "#cdeed8",
    gap: 6
  },
  homeTitle: {
    color: theme.colors.ink,
    fontSize: 20,
    fontWeight: "800"
  },
  homeMeta: {
    color: theme.colors.inkMuted,
    lineHeight: 20
  },
  paymentHighlight: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#fff6e8",
    borderWidth: 1,
    borderColor: "#f7d8a8",
    gap: 6
  },
  paymentHighlightTitle: {
    color: theme.colors.ink,
    fontSize: 18,
    fontWeight: "800"
  },
  paymentHighlightMeta: {
    color: theme.colors.inkMuted,
    lineHeight: 20
  },
  paymentHighlightAmount: {
    color: theme.colors.danger,
    fontSize: 24,
    fontWeight: "800"
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
  rowTitle: {
    color: theme.colors.ink,
    fontSize: 17,
    fontWeight: "700"
  },
  rowMeta: {
    color: theme.colors.inkMuted,
    lineHeight: 20
  },
  helperText: {
    color: theme.colors.inkMuted,
    lineHeight: 20,
    fontSize: 13
  },
  warningText: {
    color: theme.colors.warning,
    fontWeight: "700"
  },
  receiptCard: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#f9fbff",
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8
  },
  receiptHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12
  },
  receiptBadge: {
    marginTop: 6,
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#ddfbe5",
    color: theme.colors.success,
    paddingHorizontal: 10,
    paddingVertical: 5,
    overflow: "hidden",
    fontSize: 12,
    fontWeight: "700"
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
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
    backgroundColor: theme.colors.ink,
    borderColor: theme.colors.ink
  },
  choicePillText: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: "700"
  },
  choicePillTextActive: {
    color: "#fff"
  },
  successText: {
    color: theme.colors.success,
    fontWeight: "700"
  },
  passCodeText: {
    color: theme.colors.ink,
    fontWeight: "700",
    letterSpacing: 0.4
  }
});

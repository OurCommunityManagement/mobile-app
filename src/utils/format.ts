export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount || 0);
}

export function monthName(month: number) {
  return new Date(2026, Math.max(0, month - 1), 1).toLocaleString("en-IN", {
    month: "short"
  });
}

export function invoiceRemaining(invoice: { amount: number; penalty?: number; paidAmount?: number }) {
  return Math.max(0, (invoice.amount || 0) + (invoice.penalty || 0) - (invoice.paidAmount || 0));
}

export function invoiceStatus(invoice: {
  status: string;
  dueDate?: string;
  amount: number;
  penalty?: number;
  paidAmount?: number;
}) {
  const remaining = invoiceRemaining(invoice);
  if (remaining <= 0) return "paid";
  if ((invoice.paidAmount || 0) > 0) return "partial";
  if (invoice.status === "overdue") return "overdue";
  if (!invoice.dueDate) return invoice.status || "pending";
  return new Date(invoice.dueDate) < new Date() ? "overdue" : "pending";
}

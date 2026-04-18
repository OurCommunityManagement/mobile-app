import { env } from "../config/env";

type CreateOrderPayload = {
  amount: number;
  invoiceId: string;
  ownerId: string;
  communityId: string;
};

type CreateOrderResponse = {
  orderId: string;
  keyId: string;
  amount: number;
  currency: string;
};

type CheckoutPayload = {
  amount: number;
  invoiceId: string;
  ownerId: string;
  communityId: string;
  ownerName: string;
  ownerEmail: string;
  ownerMobile?: string;
  communityName: string;
  periodLabel: string;
};

type CheckoutResult = {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
};

async function callEdgeFunction<T>(name: string, payload: unknown): Promise<T> {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error("Missing Supabase configuration.");
  }

  const response = await fetch(`${env.supabaseUrl}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: env.supabaseAnonKey,
      Authorization: `Bearer ${env.supabaseAnonKey}`
    },
    body: JSON.stringify(payload ?? {})
  });

  let data: Record<string, unknown> = {};
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error((data.error as string) || `${name} failed with status ${response.status}`);
  }

  return data as T;
}

export async function startRazorpayCheckout(payload: CheckoutPayload): Promise<CheckoutResult> {
  let RazorpayCheckout: { open: (options: Record<string, unknown>) => Promise<CheckoutResult> };
  try {
    RazorpayCheckout = require("react-native-razorpay").default;
  } catch {
    throw new Error("Razorpay checkout needs a development build. Expo Go does not include the native payment module.");
  }

  const order = await callEdgeFunction<CreateOrderResponse>("razorpay-create-order", {
    amount: payload.amount,
    invoiceId: payload.invoiceId,
    ownerId: payload.ownerId,
    communityId: payload.communityId
  } satisfies CreateOrderPayload);

  if (!order.orderId || !order.keyId) {
    throw new Error("Invalid response from payment server.");
  }

  return RazorpayCheckout.open({
    key: order.keyId,
    amount: order.amount,
    currency: order.currency,
    name: payload.communityName,
    description: `Maintenance - ${payload.periodLabel}`,
    order_id: order.orderId,
    prefill: {
      name: payload.ownerName,
      email: payload.ownerEmail,
      contact: payload.ownerMobile || ""
    },
    theme: { color: "#2563eb" }
  });
}

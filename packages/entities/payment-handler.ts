import { z } from "zod";
import type { Order, WebhookEvent } from "./index";

/**
 * Payment Handler Interface
 * 
 * A payment handler bridges UCP checkout sessions with external payment providers.
 * It abstracts the details of different PSPs (Stripe, Polar, etc.) and web3 providers.
 * 
 * UCP Spec: https://ucp.dev/specification/payment-handler-guide
 */

export interface PaymentHandlerConfig {
  id: string; // e.g., "stripe", "polar", "thirdweb"
  name: string;
  apiKey: string;
  apiSecret?: string;
  webhookSecret?: string;
  environment: "test" | "live";
}

export interface PaymentHandler {
  /**
   * Create a payment intent/session with the provider
   */
  createPaymentSession(order: Order): Promise<{
    sessionId: string;
    clientSecret?: string;
    paymentUrl?: string;
    metadata?: Record<string, unknown>;
  }>;

  /**
   * Verify webhook signature to ensure authenticity
   */
  verifyWebhookSignature(
    body: string,
    signature: string
  ): Promise<boolean>;

  /**
   * Process incoming webhook event and return Order state
   */
  processWebhookEvent(event: WebhookEvent): Promise<Partial<Order>>;

  /**
   * Cancel/refund a payment
   */
  cancelPayment(orderId: string, amount?: number): Promise<{
    refundId: string;
    status: "success" | "pending" | "failed";
  }>;

  /**
   * Get payment status
   */
  getPaymentStatus(orderId: string): Promise<{
    status: "pending" | "succeeded" | "failed" | "refunded";
    amount: number;
    currency: string;
  }>;
}

/**
 * UCP Payment Handler Registry
 * Map of handler IDs to their implementations
 */
export const paymentHandlers = new Map<string, PaymentHandler>();

/**
 * Register a payment handler
 */
export function registerPaymentHandler(id: string, handler: PaymentHandler) {
  paymentHandlers.set(id, handler);
}

/**
 * Get a payment handler by ID
 */
export function getPaymentHandler(id: string): PaymentHandler | undefined {
  return paymentHandlers.get(id);
}

/**
 * Get all available handlers
 */
export function listPaymentHandlers(): string[] {
  return Array.from(paymentHandlers.keys());
}

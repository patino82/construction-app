import Stripe from "stripe";
import type { Logger } from "pino";

export interface StripeServiceOptions {
  apiKey?: string;
  logger?: Logger;
}

export class StripeService {
  private readonly client: Stripe | null;
  private readonly logger?: Logger;

  constructor(options: StripeServiceOptions) {
    this.logger = options.logger;
    this.client = options.apiKey ? new Stripe(options.apiKey, { apiVersion: "2023-10-16" }) : null;
  }

  async ensureCustomer(email: string): Promise<string | null> {
    if (!this.client) {
      this.logger?.info({ email }, "Stripe API key missing; returning null customer id");
      return null;
    }

    const customers = await this.client.customers.list({ email, limit: 1 });
    if (customers.data[0]) return customers.data[0].id;

    const created = await this.client.customers.create({ email });
    return created.id;
  }
}

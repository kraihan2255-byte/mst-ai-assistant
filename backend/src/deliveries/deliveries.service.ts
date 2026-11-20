import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProductsService } from '../products/products.service.js';
import type {
  DeliveryDraft,
  DeliveryValidationResult,
  PaymentMethod,
  PaymentStatus,
} from '../common/interfaces/delivery.interface.js';
import { ConfirmDeliveryDto } from './dto/confirm-delivery.dto.js';
import { RecordPaymentDto } from './dto/record-payment.dto.js';
import type {
  Area,
  Customer,
  Delivery,
  DeliveryItem,
  Payment,
  Product,
} from '@prisma/client';

export type CustomerWithArea = Customer & { area?: Area | null };

export interface DeliveryDetailResponse {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  deliveryDate: Date;
  deliveryType: 'ITEMIZED' | 'NON_ITEMIZED';
  isItemized: boolean;
  itemsCount: number;
  outerBoxes: number | null;
  totalAmountPaise: number;
  totalAmountRupees: number;
  totalPaidPaise: number;
  totalPaidRupees: number;
  outstandingPaise: number;
  outstandingRupees: number;
  paymentStatus: PaymentStatus;
  notes: string | null;
  idempotencyKey: string | null;
  createdAt: Date;
  customer: Customer;
  items: (DeliveryItem & { product: Product })[];
  payments: Payment[];
  isDuplicate?: boolean;
  message?: string;
}

export interface DeliveryQueryFilter {
  customerId?: string;
  startDate?: string;
  endDate?: string;
  paymentStatus?: PaymentStatus;
}

@Injectable()
export class DeliveriesService {
  private readonly logger = new Logger(DeliveriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
  ) {}

  // =========================================================================
  // Phase 1: Pure Deterministic In-Memory Business Validation (Preserved)
  // =========================================================================

  /**
   * Deterministically validates and calculates financial data for an unpersisted delivery draft.
   * Does NOT rely on any calculations or status provided by an LLM.
   */
  validateDeliveryDraft(draft: DeliveryDraft): DeliveryValidationResult {
    const missingFields: string[] = [];
    const errors: string[] = [];

    // 1. Validate action
    if (!draft.action || draft.action !== 'record_delivery') {
      errors.push(
        `Invalid action "${draft.action || 'unknown'}". Expected "record_delivery".`,
      );
    }

    // 2. Validate recipient name
    if (
      !draft.recipient_name ||
      typeof draft.recipient_name !== 'string' ||
      draft.recipient_name.trim() === ''
    ) {
      missingFields.push('recipient_name');
    }

    // 3. Validate boxes delivered (quantity)
    if (draft.boxes_delivered === null || draft.boxes_delivered === undefined) {
      missingFields.push('boxes_delivered');
    } else if (
      typeof draft.boxes_delivered !== 'number' ||
      Number.isNaN(draft.boxes_delivered)
    ) {
      errors.push('boxes_delivered must be a valid number.');
    } else if (draft.boxes_delivered < 0) {
      errors.push(
        `boxes_delivered cannot be negative (got ${draft.boxes_delivered}).`,
      );
    } else if (draft.boxes_delivered === 0) {
      errors.push('boxes_delivered must be greater than zero.');
    }

    // 4. Validate total amount
    let totalAmount: number | null = null;
    if (draft.total_amount === null || draft.total_amount === undefined) {
      missingFields.push('total_amount');
    } else if (
      typeof draft.total_amount !== 'number' ||
      Number.isNaN(draft.total_amount)
    ) {
      errors.push('total_amount must be a valid number.');
    } else if (draft.total_amount < 0) {
      errors.push(
        `total_amount cannot be negative (got ${draft.total_amount}).`,
      );
    } else {
      totalAmount = this.roundToTwoDecimals(draft.total_amount);
    }

    // 5. Validate payments and calculate total received
    let totalReceived = 0;
    const payments = Array.isArray(draft.payments) ? draft.payments : [];

    for (let i = 0; i < payments.length; i++) {
      const payment = payments[i];
      if (typeof payment.amount !== 'number' || Number.isNaN(payment.amount)) {
        errors.push(`Payment at index ${i} has an invalid amount.`);
      } else if (payment.amount < 0) {
        errors.push(
          `Payment at index ${i} cannot be negative (got ${payment.amount}).`,
        );
      } else {
        totalReceived += payment.amount;
      }
    }
    totalReceived = this.roundToTwoDecimals(totalReceived);

    // 6. Calculate outstanding balance & payment status
    let outstanding: number | null = null;
    let paymentStatus: PaymentStatus = 'UNPAID';

    if (totalAmount !== null) {
      if (totalReceived > totalAmount) {
        errors.push(
          `Total received payments (${totalReceived}) exceed the total delivery amount (${totalAmount}).`,
        );
        outstanding = this.roundToTwoDecimals(totalAmount - totalReceived);
        paymentStatus = 'PAID';
      } else {
        outstanding = this.roundToTwoDecimals(totalAmount - totalReceived);
        if (totalReceived === 0) {
          paymentStatus = 'UNPAID';
        } else if (totalReceived === totalAmount) {
          paymentStatus = 'PAID';
        } else {
          paymentStatus = 'PARTIALLY_PAID';
        }
      }
    } else {
      outstanding = null;
      paymentStatus = 'UNPAID';
    }

    const isValid = missingFields.length === 0 && errors.length === 0;

    return {
      valid: isValid,
      total_amount: totalAmount,
      total_received: totalReceived,
      outstanding,
      payment_status: paymentStatus,
      requires_confirmation: true,
      missing_fields: missingFields,
      errors,
    };
  }

  // =========================================================================
  // Phase 2: Database Persistence, Confirmation & Transaction Management
  // =========================================================================

  /**
   * Confirms and persists a delivery with line items and payments in one transaction.
   * Includes idempotency protection, customer verification, and strict recalculation.
   */
  async confirmDelivery(
    dto: ConfirmDeliveryDto,
  ): Promise<DeliveryDetailResponse> {
    // 1. Explicit confirmation check
    if (!dto.confirmed) {
      throw new BadRequestException(
        'Explicit user confirmation is required to save delivery (confirmed must be true).',
      );
    }

    // 2. Idempotency protection
    if (dto.idempotencyKey && dto.idempotencyKey.trim() !== '') {
      const existing = await this.prisma.delivery.findUnique({
        where: { idempotencyKey: dto.idempotencyKey.trim() },
        include: {
          customer: { include: { area: true } },
          items: { include: { product: true } },
          payments: true,
        },
      });

      if (existing) {
        this.logger.warn(
          `Idempotent duplicate request caught for key ${dto.idempotencyKey}. Returning existing delivery ${existing.id}.`,
        );
        return {
          ...this.formatDeliveryDetail(existing),
          isDuplicate: true,
          message: 'Delivery already processed with this idempotency key.',
        };
      }
    }

    // 3. Customer validation
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw new NotFoundException(
        `Customer with ID "${dto.customerId}" not found.`,
      );
    }

    // 4. Delivery date
    const deliveryDate = dto.deliveryDate
      ? new Date(dto.deliveryDate)
      : new Date();

    // 5. Outer boxes validation
    if (dto.outerBoxes !== undefined && dto.outerBoxes !== null) {
      if (dto.outerBoxes < 0) {
        throw new BadRequestException(
          `Outer box count cannot be negative (got ${dto.outerBoxes}).`,
        );
      }
    }

    // 6. Determine delivery type and process items/totals
    const isItemized =
      dto.isItemized !== undefined
        ? dto.isItemized
        : dto.items !== undefined && dto.items.length > 0;

    interface ProcessedItem {
      productId: string;
      quantity: number;
      unitPricePaise: number;
      lineTotalPaise: number;
    }
    const processedItems: ProcessedItem[] = [];
    let totalAmountPaise = 0;

    if (isItemized) {
      if (!dto.items || dto.items.length === 0) {
        throw new BadRequestException(
          'An itemized delivery must contain at least one delivery item.',
        );
      }

      for (let i = 0; i < dto.items.length; i++) {
        const item = dto.items[i];
        if (
          !item.productId ||
          typeof item.productId !== 'string' ||
          item.productId.trim() === ''
        ) {
          throw new BadRequestException(
            `Item at index ${i} is missing a valid productId.`,
          );
        }

        if (
          !item.quantity ||
          typeof item.quantity !== 'number' ||
          item.quantity < 1 ||
          !Number.isInteger(item.quantity)
        ) {
          throw new BadRequestException(
            `Item at index ${i} has invalid quantity (${item.quantity}). Quantity must be an integer of at least 1.`,
          );
        }

        // Verify product exists and is active
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId.trim() },
        });
        if (!product || !product.isActive) {
          throw new BadRequestException(
            `Product with ID "${item.productId}" is invalid or inactive.`,
          );
        }

        // Determine applicable unit price
        let unitPricePaise = 0;
        if (item.unitPricePaise !== undefined) {
          unitPricePaise = item.unitPricePaise;
        } else if (item.unitPriceRupees !== undefined) {
          unitPricePaise = Math.round(item.unitPriceRupees * 100);
        } else {
          unitPricePaise = await this.productsService.getEffectivePrice(
            product.id,
            deliveryDate,
          );
        }

        if (unitPricePaise <= 0) {
          throw new BadRequestException(
            `Unit price for product "${product.name}" must be greater than zero (got ₹${unitPricePaise / 100}).`,
          );
        }

        const lineTotalPaise = item.quantity * unitPricePaise;
        totalAmountPaise += lineTotalPaise;

        processedItems.push({
          productId: product.id,
          quantity: item.quantity,
          unitPricePaise,
          lineTotalPaise,
        });
      }
    } else {
      // Non-itemized delivery
      if (dto.items && dto.items.length > 0) {
        throw new BadRequestException(
          'A non-itemized delivery cannot contain delivery items.',
        );
      }

      if (dto.totalAmountPaise !== undefined) {
        totalAmountPaise = dto.totalAmountPaise;
      } else if (dto.totalAmountRupees !== undefined) {
        totalAmountPaise = Math.round(dto.totalAmountRupees * 100);
      } else {
        throw new BadRequestException(
          'Non-itemized delivery must provide a valid total amount.',
        );
      }
    }

    if (totalAmountPaise <= 0) {
      throw new BadRequestException(
        `Total delivery amount must be greater than zero (got ₹${totalAmountPaise / 100}).`,
      );
    }

    // 8. Process payments
    interface ProcessedPayment {
      amountPaise: number;
      method: PaymentMethod;
      provider?: string | null;
      paymentDate: Date;
      reference?: string | null;
      notes?: string | null;
    }
    const processedPayments: ProcessedPayment[] = [];
    let totalPaidPaise = 0;
    const inputPayments = dto.payments || [];

    for (let i = 0; i < inputPayments.length; i++) {
      const p = inputPayments[i];
      let amountPaise = 0;
      if (p.amountPaise !== undefined) {
        amountPaise = p.amountPaise;
      } else if (p.amountRupees !== undefined) {
        amountPaise = Math.round(p.amountRupees * 100);
      }

      if (amountPaise < 0) {
        throw new BadRequestException(
          `Payment at index ${i} cannot be negative (got ₹${amountPaise / 100}).`,
        );
      }

      if (amountPaise > 0) {
        totalPaidPaise += amountPaise;
        processedPayments.push({
          amountPaise,
          method: p.method,
          provider: p.provider || null,
          paymentDate: p.paymentDate ? new Date(p.paymentDate) : new Date(),
          reference: p.reference || null,
          notes: p.notes || null,
        });
      }
    }

    // 9. Financial guardrail: payments must not exceed total amount
    if (totalPaidPaise > totalAmountPaise) {
      throw new BadRequestException(
        `Total received payments (₹${totalPaidPaise / 100}) exceed total delivery amount (₹${totalAmountPaise / 100}).`,
      );
    }

    // 10. Persist delivery, items, and payments atomically in one transaction
    try {
      const saved = await this.prisma.$transaction(async (tx) => {
        const year = deliveryDate.getFullYear();
        const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
        const endOfYear = new Date(`${year + 1}-01-01T00:00:00.000Z`);
        const yearCount = await tx.delivery.count({
          where: {
            deliveryDate: {
              gte: startOfYear,
              lt: endOfYear,
            },
          },
        });
        const invoiceNumber = `MST-INV-${year}-${String(yearCount + 1).padStart(4, '0')}`;

        const delivery = await tx.delivery.create({
          data: {
            customerId: customer.id,
            invoiceNumber,
            deliveryDate,
            outerBoxes: dto.outerBoxes !== undefined ? dto.outerBoxes : null,
            totalAmountPaise,
            notes: dto.notes?.trim() || null,
            idempotencyKey: dto.idempotencyKey?.trim() || null,
          },
        });

        if (processedItems.length > 0) {
          await tx.deliveryItem.createMany({
            data: processedItems.map((item) => ({
              deliveryId: delivery.id,
              productId: item.productId,
              quantity: item.quantity,
              unitPricePaise: item.unitPricePaise,
              lineTotalPaise: item.lineTotalPaise,
            })),
          });
        }

        if (processedPayments.length > 0) {
          await tx.payment.createMany({
            data: processedPayments.map((p) => ({
              deliveryId: delivery.id,
              amountPaise: p.amountPaise,
              method: p.method,
              provider: p.provider,
              paymentDate: p.paymentDate,
              reference: p.reference,
              notes: p.notes,
            })),
          });
        }

        return tx.delivery.findUniqueOrThrow({
          where: { id: delivery.id },
          include: {
            customer: { include: { area: true } },
            items: { include: { product: true } },
            payments: true,
          },
        });
      });

      this.logger.log(
        `Persisted delivery ${saved.id} for "${customer.name}": Billed=₹${saved.totalAmountPaise / 100}, Paid=₹${totalPaidPaise / 100}, Outstanding=₹${(saved.totalAmountPaise - totalPaidPaise) / 100}`,
      );

      return this.formatDeliveryDetail(saved);
    } catch (error: unknown) {
      const prismaError = error as {
        code?: string;
        meta?: { target?: string[] };
        message?: string;
      };
      if (
        prismaError?.code === 'P2002' &&
        dto.idempotencyKey &&
        (prismaError.meta?.target?.includes('idempotencyKey') ||
          String(prismaError.message).includes('idempotencyKey'))
      ) {
        const existing = await this.prisma.delivery.findUnique({
          where: { idempotencyKey: dto.idempotencyKey.trim() },
          include: {
            customer: true,
            items: { include: { product: true } },
            payments: true,
          },
        });
        if (existing) {
          this.logger.warn(
            `Concurrent duplicate caught by unique constraint for key ${dto.idempotencyKey}. Returning existing delivery ${existing.id}.`,
          );
          return {
            ...this.formatDeliveryDetail(existing),
            isDuplicate: true,
            message: 'Delivery already processed with this idempotency key.',
          };
        }
      }
      throw error;
    }
  }

  /**
   * Records an additional payment against an existing delivery in a database transaction.
   * Employs row-level locking (FOR UPDATE) to prevent concurrent overpayments.
   */
  async recordPayment(
    deliveryId: string,
    dto: RecordPaymentDto,
  ): Promise<DeliveryDetailResponse> {
    let paymentPaise = 0;
    if (dto.amountPaise !== undefined) {
      paymentPaise = dto.amountPaise;
    } else if (dto.amountRupees !== undefined) {
      paymentPaise = Math.round(dto.amountRupees * 100);
    }

    if (paymentPaise <= 0) {
      throw new BadRequestException(
        'Payment amount must be greater than zero.',
      );
    }

    const updatedDelivery = await this.prisma.$transaction(async (tx) => {
      // Row-level lock to prevent concurrent payment race conditions
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM deliveries WHERE id = ${deliveryId} FOR UPDATE
      `;
      if (!locked || locked.length === 0) {
        throw new NotFoundException(
          `Delivery with ID "${deliveryId}" not found.`,
        );
      }

      const delivery = await tx.delivery.findUnique({
        where: { id: deliveryId },
        include: { payments: true },
      });

      if (!delivery) {
        throw new NotFoundException(
          `Delivery with ID "${deliveryId}" not found.`,
        );
      }

      const currentPaidPaise = delivery.payments.reduce(
        (sum, p) => sum + p.amountPaise,
        0,
      );
      const remainingOutstandingPaise = Math.max(
        0,
        delivery.totalAmountPaise - currentPaidPaise,
      );

      if (paymentPaise > remainingOutstandingPaise) {
        throw new BadRequestException(
          `Payment amount (₹${paymentPaise / 100}) exceeds remaining outstanding balance (₹${remainingOutstandingPaise / 100}).`,
        );
      }

      await tx.payment.create({
        data: {
          deliveryId,
          amountPaise: paymentPaise,
          method: dto.method,
          provider: dto.provider || null,
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
          reference: dto.reference || null,
          notes: dto.notes || null,
        },
      });

      return tx.delivery.findUniqueOrThrow({
        where: { id: deliveryId },
        include: {
          customer: { include: { area: true } },
          items: { include: { product: true } },
          payments: true,
        },
      });
    });

    this.logger.log(
      `Recorded payment of ₹${paymentPaise / 100} for delivery ${deliveryId}.`,
    );

    return this.formatDeliveryDetail(updatedDelivery);
  }

  async findAll(
    filter?: DeliveryQueryFilter,
  ): Promise<DeliveryDetailResponse[]> {
    const where: Record<string, unknown> = {};

    if (filter?.customerId) {
      where.customerId = filter.customerId;
    }

    if (filter?.startDate || filter?.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (filter.startDate) dateFilter.gte = new Date(filter.startDate);
      if (filter.endDate) dateFilter.lte = new Date(filter.endDate);
      where.deliveryDate = dateFilter;
    }

    const deliveries = await this.prisma.delivery.findMany({
      where,
      include: {
        customer: { include: { area: true } },
        items: { include: { product: true } },
        payments: true,
      },
      orderBy: { deliveryDate: 'desc' },
    });

    const formatted = deliveries.map((d) => this.formatDeliveryDetail(d));

    if (filter?.paymentStatus) {
      return formatted.filter((d) => d.paymentStatus === filter.paymentStatus);
    }

    return formatted;
  }

  async findOne(id: string): Promise<DeliveryDetailResponse> {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: {
        customer: { include: { area: true } },
        items: { include: { product: true } },
        payments: true,
      },
    });

    if (!delivery) {
      throw new NotFoundException(`Delivery with ID "${id}" not found.`);
    }

    return this.formatDeliveryDetail(delivery);
  }

  async findByCustomer(customerId: string): Promise<DeliveryDetailResponse[]> {
    return this.findAll({ customerId });
  }

  private formatDeliveryDetail(
    delivery: Delivery & {
      customer: CustomerWithArea;
      items: (DeliveryItem & { product: Product })[];
      payments: Payment[];
    },
  ): DeliveryDetailResponse {
    const totalPaidPaise = delivery.payments.reduce(
      (sum, p) => sum + p.amountPaise,
      0,
    );
    const outstandingPaise = Math.max(
      0,
      delivery.totalAmountPaise - totalPaidPaise,
    );

    let paymentStatus: PaymentStatus = 'UNPAID';
    if (totalPaidPaise === 0) {
      paymentStatus = 'UNPAID';
    } else if (totalPaidPaise >= delivery.totalAmountPaise) {
      paymentStatus = 'PAID';
    } else {
      paymentStatus = 'PARTIALLY_PAID';
    }

    const isItemized = Boolean(delivery.items && delivery.items.length > 0);
    const invoiceNumber =
      delivery.invoiceNumber ||
      `MST-INV-${delivery.deliveryDate ? new Date(delivery.deliveryDate).getFullYear() : '2026'}-${delivery.id.slice(0, 8).toUpperCase()}`;

    return {
      id: delivery.id,
      invoiceNumber,
      customerId: delivery.customerId,
      customerName: delivery.customer.name,
      deliveryDate: delivery.deliveryDate,
      deliveryType: isItemized ? 'ITEMIZED' : 'NON_ITEMIZED',
      isItemized,
      itemsCount: delivery.items?.length || 0,
      outerBoxes: delivery.outerBoxes,
      totalAmountPaise: delivery.totalAmountPaise,
      totalAmountRupees: delivery.totalAmountPaise / 100,
      totalPaidPaise,
      totalPaidRupees: totalPaidPaise / 100,
      outstandingPaise,
      outstandingRupees: outstandingPaise / 100,
      paymentStatus,
      notes: delivery.notes,
      idempotencyKey: delivery.idempotencyKey,
      createdAt: delivery.createdAt,
      customer: delivery.customer,
      items: delivery.items,
      payments: delivery.payments,
    };
  }

  private roundToTwoDecimals(num: number): number {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }
}

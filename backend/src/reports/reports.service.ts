import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ReportQueryDto } from './dto/report-query.dto.js';
import type { PaymentMethod } from '../common/interfaces/delivery.interface.js';

export interface FinancialSummaryReport {
  startDate: string | null;
  endDate: string | null;
  totalDeliveries: number;
  totalDeliveryValuePaise: number;
  totalDeliveryValueRupees: number;
  totalPaymentsReceivedPaise: number;
  totalPaymentsReceivedRupees: number;
  totalOutstandingCreditPaise: number;
  totalOutstandingCreditRupees: number;
  customersWithOutstandingCount: number;
  totalOuterBoxes: number;
}

export interface CustomerOutstandingItem {
  customerId: string;
  customerName: string;
  phone: string | null;
  areaName: string | null;
  totalBilledPaise: number;
  totalBilledRupees: number;
  totalPaidPaise: number;
  totalPaidRupees: number;
  outstandingPaise: number;
  outstandingRupees: number;
  unpaidDeliveriesCount: number;
}

export interface DeliveriesReportResponse {
  startDate: string | null;
  endDate: string | null;
  totalDeliveries: number;
  totalValuePaise: number;
  totalValueRupees: number;
  totalOuterBoxes: number;
  deliveries: Array<{
    id: string;
    customerName: string;
    deliveryDate: Date;
    outerBoxes: number | null;
    totalAmountRupees: number;
    totalPaidRupees: number;
    outstandingRupees: number;
    paymentStatus: string;
  }>;
}

export interface PaymentsReportResponse {
  startDate: string | null;
  endDate: string | null;
  totalPaymentsCount: number;
  totalPaymentsPaise: number;
  totalPaymentsRupees: number;
  byMethod: Record<
    PaymentMethod,
    { count: number; totalPaise: number; totalRupees: number }
  >;
  byProvider: Record<
    string,
    { count: number; totalPaise: number; totalRupees: number }
  >;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSummary(query?: ReportQueryDto): Promise<FinancialSummaryReport> {
    const deliveryDateFilter: Record<string, Date> = {};
    if (query?.startDate) deliveryDateFilter.gte = new Date(query.startDate);
    if (query?.endDate) deliveryDateFilter.lte = new Date(query.endDate);

    const whereDelivery =
      Object.keys(deliveryDateFilter).length > 0
        ? { deliveryDate: deliveryDateFilter }
        : {};

    const deliveries = await this.prisma.delivery.findMany({
      where: whereDelivery,
      include: { payments: true },
    });

    let totalDeliveryValuePaise = 0;
    let totalPaymentsReceivedPaise = 0;
    let totalOuterBoxes = 0;

    for (const d of deliveries) {
      totalDeliveryValuePaise += d.totalAmountPaise;
      totalOuterBoxes += d.outerBoxes || 0;
      for (const p of d.payments) {
        totalPaymentsReceivedPaise += p.amountPaise;
      }
    }

    const totalOutstandingCreditPaise = Math.max(
      0,
      totalDeliveryValuePaise - totalPaymentsReceivedPaise,
    );

    // Count customers who currently have outstanding credit across all their deliveries
    const customers = await this.prisma.customer.findMany({
      include: {
        deliveries: {
          include: { payments: true },
        },
      },
    });

    let customersWithOutstandingCount = 0;
    for (const c of customers) {
      let custBilled = 0;
      let custPaid = 0;
      for (const d of c.deliveries) {
        custBilled += d.totalAmountPaise;
        for (const p of d.payments) {
          custPaid += p.amountPaise;
        }
      }
      if (custBilled > custPaid) {
        customersWithOutstandingCount++;
      }
    }

    return {
      startDate: query?.startDate || null,
      endDate: query?.endDate || null,
      totalDeliveries: deliveries.length,
      totalDeliveryValuePaise,
      totalDeliveryValueRupees: totalDeliveryValuePaise / 100,
      totalPaymentsReceivedPaise,
      totalPaymentsReceivedRupees: totalPaymentsReceivedPaise / 100,
      totalOutstandingCreditPaise,
      totalOutstandingCreditRupees: totalOutstandingCreditPaise / 100,
      customersWithOutstandingCount,
      totalOuterBoxes,
    };
  }

  async getOutstanding(): Promise<CustomerOutstandingItem[]> {
    const customers = await this.prisma.customer.findMany({
      include: {
        area: true,
        deliveries: {
          include: { payments: true },
        },
      },
    });

    const outstandingList: CustomerOutstandingItem[] = [];

    for (const c of customers) {
      let totalBilledPaise = 0;
      let totalPaidPaise = 0;
      let unpaidDeliveriesCount = 0;

      for (const d of c.deliveries) {
        totalBilledPaise += d.totalAmountPaise;
        let deliveryPaid = 0;
        for (const p of d.payments) {
          deliveryPaid += p.amountPaise;
        }
        totalPaidPaise += deliveryPaid;
        if (deliveryPaid < d.totalAmountPaise) {
          unpaidDeliveriesCount++;
        }
      }

      const outstandingPaise = Math.max(0, totalBilledPaise - totalPaidPaise);

      if (outstandingPaise > 0) {
        outstandingList.push({
          customerId: c.id,
          customerName: c.name,
          phone: c.phone,
          areaName: c.area?.name || null,
          totalBilledPaise,
          totalBilledRupees: totalBilledPaise / 100,
          totalPaidPaise,
          totalPaidRupees: totalPaidPaise / 100,
          outstandingPaise,
          outstandingRupees: outstandingPaise / 100,
          unpaidDeliveriesCount,
        });
      }
    }

    return outstandingList.sort(
      (a, b) => b.outstandingPaise - a.outstandingPaise,
    );
  }

  async getDeliveriesReport(
    query?: ReportQueryDto,
  ): Promise<DeliveriesReportResponse> {
    const deliveryDateFilter: Record<string, Date> = {};
    if (query?.startDate) deliveryDateFilter.gte = new Date(query.startDate);
    if (query?.endDate) deliveryDateFilter.lte = new Date(query.endDate);

    const where =
      Object.keys(deliveryDateFilter).length > 0
        ? { deliveryDate: deliveryDateFilter }
        : {};

    const deliveries = await this.prisma.delivery.findMany({
      where,
      include: {
        customer: true,
        payments: true,
      },
      orderBy: { deliveryDate: 'desc' },
    });

    let totalValuePaise = 0;
    let totalOuterBoxes = 0;

    const formatted = deliveries.map((d) => {
      totalValuePaise += d.totalAmountPaise;
      totalOuterBoxes += d.outerBoxes || 0;

      const paidPaise = d.payments.reduce((sum, p) => sum + p.amountPaise, 0);
      const outstandingPaise = Math.max(0, d.totalAmountPaise - paidPaise);

      let status = 'UNPAID';
      if (paidPaise >= d.totalAmountPaise) status = 'PAID';
      else if (paidPaise > 0) status = 'PARTIALLY_PAID';

      return {
        id: d.id,
        customerName: d.customer.name,
        deliveryDate: d.deliveryDate,
        outerBoxes: d.outerBoxes,
        totalAmountRupees: d.totalAmountPaise / 100,
        totalPaidRupees: paidPaise / 100,
        outstandingRupees: outstandingPaise / 100,
        paymentStatus: status,
      };
    });

    return {
      startDate: query?.startDate || null,
      endDate: query?.endDate || null,
      totalDeliveries: deliveries.length,
      totalValuePaise,
      totalValueRupees: totalValuePaise / 100,
      totalOuterBoxes,
      deliveries: formatted,
    };
  }

  async getPaymentsReport(
    query?: ReportQueryDto,
  ): Promise<PaymentsReportResponse> {
    const paymentDateFilter: Record<string, Date> = {};
    if (query?.startDate) paymentDateFilter.gte = new Date(query.startDate);
    if (query?.endDate) paymentDateFilter.lte = new Date(query.endDate);

    const where =
      Object.keys(paymentDateFilter).length > 0
        ? { paymentDate: paymentDateFilter }
        : {};

    const payments = await this.prisma.payment.findMany({
      where,
      orderBy: { paymentDate: 'desc' },
    });

    let totalPaymentsPaise = 0;
    const byMethod: Record<
      PaymentMethod,
      { count: number; totalPaise: number; totalRupees: number }
    > = {
      CASH: { count: 0, totalPaise: 0, totalRupees: 0 },
      UPI: { count: 0, totalPaise: 0, totalRupees: 0 },
      CHEQUE: { count: 0, totalPaise: 0, totalRupees: 0 },
      BANK_TRANSFER: { count: 0, totalPaise: 0, totalRupees: 0 },
      OTHER: { count: 0, totalPaise: 0, totalRupees: 0 },
    };

    const byProvider: Record<
      string,
      { count: number; totalPaise: number; totalRupees: number }
    > = {};

    for (const p of payments) {
      totalPaymentsPaise += p.amountPaise;

      const methodKey = p.method as PaymentMethod;
      if (!byMethod[methodKey]) {
        byMethod[methodKey] = { count: 0, totalPaise: 0, totalRupees: 0 };
      }
      byMethod[methodKey].count++;
      byMethod[methodKey].totalPaise += p.amountPaise;
      byMethod[methodKey].totalRupees = byMethod[methodKey].totalPaise / 100;

      const providerKey = p.provider?.trim() || 'Unspecified';
      if (!byProvider[providerKey]) {
        byProvider[providerKey] = { count: 0, totalPaise: 0, totalRupees: 0 };
      }
      byProvider[providerKey].count++;
      byProvider[providerKey].totalPaise += p.amountPaise;
      byProvider[providerKey].totalRupees =
        byProvider[providerKey].totalPaise / 100;
    }

    return {
      startDate: query?.startDate || null,
      endDate: query?.endDate || null,
      totalPaymentsCount: payments.length,
      totalPaymentsPaise,
      totalPaymentsRupees: totalPaymentsPaise / 100,
      byMethod,
      byProvider,
    };
  }
}

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Customer, Area } from '@prisma/client';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';
import { CustomerQueryDto } from './dto/customer-query.dto.js';

export interface CustomerWithArea extends Customer {
  area: Area | null;
}

export interface CustomerBalanceResponse {
  customerId: string;
  customerName: string;
  phone: string | null;
  totalDeliveries: number;
  totalBilledPaise: number;
  totalBilledRupees: number;
  totalPaidPaise: number;
  totalPaidRupees: number;
  outstandingPaise: number;
  outstandingRupees: number;
  paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
}

export interface CustomerMatchResult {
  matched: boolean;
  confidence: 'high' | 'medium' | 'none';
  customer?: CustomerWithArea;
  candidates: CustomerWithArea[];
}

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCustomerDto): Promise<CustomerWithArea> {
    if (dto.areaId) {
      const area = await this.prisma.area.findUnique({
        where: { id: dto.areaId },
      });
      if (!area) {
        throw new BadRequestException(`Area with ID ${dto.areaId} not found.`);
      }
    }

    const customer = await this.prisma.customer.create({
      data: {
        name: dto.name.trim(),
        phone: dto.phone?.trim() || null,
        areaId: dto.areaId || null,
        address: dto.address?.trim() || null,
        notes: dto.notes?.trim() || null,
      },
      include: {
        area: true,
      },
    });

    this.logger.log(`Created customer "${customer.name}" (ID: ${customer.id})`);
    return customer;
  }

  async findAll(query?: CustomerQueryDto): Promise<CustomerWithArea[]> {
    const where: Record<string, unknown> = {};

    if (query?.search && query.search.trim() !== '') {
      const searchTerm = query.search.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { phone: { contains: searchTerm } },
      ];
    }

    if (query?.phone && query.phone.trim() !== '') {
      where.phone = { contains: query.phone.trim() };
    }

    return this.prisma.customer.findMany({
      where,
      include: {
        area: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async getAreas(): Promise<Area[]> {
    return this.prisma.area.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string): Promise<CustomerWithArea> {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        area: true,
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found.`);
    }

    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<CustomerWithArea> {
    await this.findOne(id);

    if (dto.areaId) {
      const area = await this.prisma.area.findUnique({
        where: { id: dto.areaId },
      });
      if (!area) {
        throw new BadRequestException(`Area with ID ${dto.areaId} not found.`);
      }
    }

    return this.prisma.customer.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.phone !== undefined
          ? { phone: dto.phone?.trim() || null }
          : {}),
        ...(dto.areaId !== undefined ? { areaId: dto.areaId || null } : {}),
        ...(dto.address !== undefined
          ? { address: dto.address?.trim() || null }
          : {}),
        ...(dto.notes !== undefined
          ? { notes: dto.notes?.trim() || null }
          : {}),
      },
      include: {
        area: true,
      },
    });
  }

  /**
   * Calculates a customer's total deliveries, payments, and outstanding credit
   * purely from persisted database transactions.
   */
  async getBalance(id: string): Promise<CustomerBalanceResponse> {
    const customer = await this.findOne(id);

    const deliveries = await this.prisma.delivery.findMany({
      where: { customerId: id },
      include: {
        payments: true,
      },
    });

    let totalBilledPaise = 0;
    let totalPaidPaise = 0;

    for (const d of deliveries) {
      totalBilledPaise += d.totalAmountPaise;
      for (const p of d.payments) {
        totalPaidPaise += p.amountPaise;
      }
    }

    const outstandingPaise = Math.max(0, totalBilledPaise - totalPaidPaise);

    let paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' = 'PAID';
    if (totalBilledPaise > 0) {
      if (totalPaidPaise === 0) {
        paymentStatus = 'UNPAID';
      } else if (totalPaidPaise < totalBilledPaise) {
        paymentStatus = 'PARTIALLY_PAID';
      } else {
        paymentStatus = 'PAID';
      }
    }

    return {
      customerId: customer.id,
      customerName: customer.name,
      phone: customer.phone,
      totalDeliveries: deliveries.length,
      totalBilledPaise,
      totalBilledRupees: totalBilledPaise / 100,
      totalPaidPaise,
      totalPaidRupees: totalPaidPaise / 100,
      outstandingPaise,
      outstandingRupees: outstandingPaise / 100,
      paymentStatus,
    };
  }

  /**
   * Matches a raw customer name against the database.
   * Never assumes customer names are unique.
   */
  async matchCustomer(rawName: string): Promise<CustomerMatchResult> {
    const cleanName = rawName.trim();
    if (!cleanName) {
      return { matched: false, confidence: 'none', candidates: [] };
    }

    // 1. Exact match (case-insensitive)
    const exactMatches = await this.prisma.customer.findMany({
      where: {
        name: { equals: cleanName, mode: 'insensitive' },
      },
      include: { area: true },
    });

    if (exactMatches.length === 1) {
      return {
        matched: true,
        confidence: 'high',
        customer: exactMatches[0],
        candidates: exactMatches,
      };
    }

    if (exactMatches.length > 1) {
      return {
        matched: false,
        confidence: 'medium',
        candidates: exactMatches,
      };
    }

    // 2. Contains match (Ambiguous: never automatically link, require explicit user selection)
    const containsMatches = await this.prisma.customer.findMany({
      where: {
        name: { contains: cleanName, mode: 'insensitive' },
      },
      include: { area: true },
      take: 10,
    });

    return {
      matched: false,
      confidence: containsMatches.length > 0 ? 'medium' : 'none',
      candidates: containsMatches,
    };
  }
}

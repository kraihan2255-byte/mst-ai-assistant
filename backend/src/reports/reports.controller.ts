import { Controller, Get, Query } from '@nestjs/common';
import {
  CustomerOutstandingItem,
  DeliveriesReportResponse,
  FinancialSummaryReport,
  PaymentsReportResponse,
  ReportsService,
} from './reports.service.js';
import { ReportQueryDto } from './dto/report-query.dto.js';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  getSummary(@Query() query: ReportQueryDto): Promise<FinancialSummaryReport> {
    return this.reportsService.getSummary(query);
  }

  @Get('outstanding')
  getOutstanding(): Promise<CustomerOutstandingItem[]> {
    return this.reportsService.getOutstanding();
  }

  @Get('deliveries')
  getDeliveries(
    @Query() query: ReportQueryDto,
  ): Promise<DeliveriesReportResponse> {
    return this.reportsService.getDeliveriesReport(query);
  }

  @Get('payments')
  getPayments(@Query() query: ReportQueryDto): Promise<PaymentsReportResponse> {
    return this.reportsService.getPaymentsReport(query);
  }
}

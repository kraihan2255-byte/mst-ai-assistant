import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  CustomerBalanceResponse,
  CustomersService,
  CustomerWithArea,
} from './customers.service.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';
import { CustomerQueryDto } from './dto/customer-query.dto.js';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateCustomerDto): Promise<CustomerWithArea> {
    return this.customersService.create(dto);
  }

  @Get()
  findAll(@Query() query: CustomerQueryDto): Promise<CustomerWithArea[]> {
    return this.customersService.findAll(query);
  }

  @Get('areas')
  getAreas(): Promise<import('@prisma/client').Area[]> {
    return this.customersService.getAreas();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<CustomerWithArea> {
    return this.customersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ): Promise<CustomerWithArea> {
    return this.customersService.update(id, dto);
  }

  @Get(':id/balance')
  getBalance(@Param('id') id: string): Promise<CustomerBalanceResponse> {
    return this.customersService.getBalance(id);
  }
}

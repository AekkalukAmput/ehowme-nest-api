import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ListExpenseEventsDto } from './dto/list-expense-events.dto';
import { ExpenseService } from './expense.service';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';

@ApiTags('expense')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('expense-events')
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @ApiOperation({
    summary: 'List expense events',
    operationId: 'listExpenseEvents',
  })
  @Get()
  async list(@Req() req: any, @Query() q: ListExpenseEventsDto) {
    return this.expenseService.list(req.user.sub, q);
  }

  @ApiOperation({
    summary: 'Get one expense event',
    operationId: 'getExpenseEvent',
  })
  @Get(':id')
  async get(@Req() req: any, @Param('id') id: string) {
    return this.expenseService.get(req.user.sub, id);
  }

  @ApiOperation({
    summary: 'Create expense event',
    operationId: 'createExpenseEvent',
  })
  @ApiBody({ type: CreateExpenseDto })
  @Post()
  async create(@Req() req: any, @Body() dto: CreateExpenseDto) {
    return this.expenseService.create(req.user.sub, dto);
  }

  @ApiOperation({
    summary: 'Update expense event',
    operationId: 'updateExpenseEvent',
  })
  @Patch(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expenseService.update(req.user.sub, id, dto);
  }

  @ApiOperation({
    summary: 'Delete expense event',
    operationId: 'deleteExpenseEvent',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    await this.expenseService.remove(req.user.sub, id);
    return;
  }

  @ApiOperation({
    summary: 'Summary totals',
    operationId: 'summaryExpenseEvents',
  })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @Get('~summary')
  async summary(
    @Req() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.expenseService.summary(req.user.sub, { from, to });
  }
}

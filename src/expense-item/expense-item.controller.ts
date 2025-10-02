import { Controller } from '@nestjs/common';
import { ExpenseItemService } from './expense-item.service';

@Controller('expense-item')
export class ExpenseItemController {
  constructor(private readonly expenseItemService: ExpenseItemService) {}
}

import { Test, TestingModule } from '@nestjs/testing';
import { ExpenseItemController } from './expense-item.controller';
import { ExpenseItemService } from './expense-item.service';

describe('ExpenseItemController', () => {
  let controller: ExpenseItemController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExpenseItemController],
      providers: [ExpenseItemService],
    }).compile();

    controller = module.get<ExpenseItemController>(ExpenseItemController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

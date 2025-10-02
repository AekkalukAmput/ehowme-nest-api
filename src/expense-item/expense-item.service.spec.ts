import { Test, TestingModule } from '@nestjs/testing';
import { ExpenseItemService } from './expense-item.service';

describe('ExpenseItemService', () => {
  let service: ExpenseItemService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExpenseItemService],
    }).compile();

    service = module.get<ExpenseItemService>(ExpenseItemService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

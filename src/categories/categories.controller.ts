import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@ApiTags('categories')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @ApiOperation({ summary: 'List categories (flat)' })
  @ApiQuery({ name: 'type', required: false, enum: ['income', 'expense'] })
  @Get()
  list(@Req() req: any, @Query('type') type?: 'income' | 'expense') {
    return this.categoriesService.list(req.user.sub, type);
  }

  @ApiOperation({ summary: 'List categories (tree)' })
  @ApiQuery({ name: 'type', required: false, enum: ['income', 'expense'] })
  @Get('tree')
  tree(@Req() req: any, @Query('type') type?: 'income' | 'expense') {
    return this.categoriesService.tree(req.user.sub, type);
  }

  @ApiOperation({ summary: 'Create category' })
  @Post()
  create(@Req() req: any, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(req.user.sub, dto);
  }

  @ApiOperation({ summary: 'Update category' })
  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(req.user.sub, id, dto);
  }

  @ApiOperation({ summary: 'Delete category (block if has children or used)' })
  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.categoriesService.remove(req.user.sub, id);
  }

  @ApiOperation({ summary: 'Seed default categories for this user (run once)' })
  @Post('~seed-defaults')
  seed(@Req() req: any) {
    return this.categoriesService.seedDefaults(req.user.sub);
  }
}

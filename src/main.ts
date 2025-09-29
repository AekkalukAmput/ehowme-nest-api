import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api', { exclude: ['docs', 'docs-json'] });
  const config = new DocumentBuilder()
    .setTitle('Auth API (NestJS + Prisma)')
    .setDescription('JWT Access/Refresh with rotation, Swagger docs')
    .setVersion('1.0.0')
    // สร้างสอง security schemes แยก access / refresh
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'refresh-token',
    )
    .addServer('/api', 'Dev via Angular proxy')
    .build();

  const doc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, doc);
  // ให้ Nest ส่งสัญญาณ lifecycle ตอนปิดแอป
  app.enableShutdownHooks();

  app.enableCors({ origin: 'http://localhost:4200', credentials: true });

  const port = Number(process.env.PORT ?? 3001);
  const host = process.env.HOST ?? '127.0.0.1';
  await app.listen(port, host);
  console.log(`Server running on http://${host}:${port}`);
  console.log(`Swagger docs → http://${host}:${port}/docs`);
}
bootstrap();

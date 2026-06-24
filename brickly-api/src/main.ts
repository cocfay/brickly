import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  //const app = await NestFactory.create(AppModule);
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  

  // 🔐 Validación global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,              // elimina propiedades no permitidas
      forbidNonWhitelisted: true,   // error si envían campos extra
      transform: true,              // transforma tipos automáticamente
    }),
  );

  // 🌐 Habilitar CORS (necesario si tendrás frontend separado)
  app.enableCors({
    origin: true, // puedes restringir luego
    credentials: true,
  });

  app.useStaticAssets(join(process.cwd(),'uploads'));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

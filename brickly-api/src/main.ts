import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as express from 'express';

async function bootstrap() {
  // ⚠️ bodyParser: false porque lo configuramos manualmente abajo
  // para poder capturar el rawBody (necesario para verificar la firma
  // del webhook de Recurrente sin afectar al resto de rutas).
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  // 🧾 Body parser global que además guarda el buffer crudo en req.rawBody
  app.use(
    express.json({
      verify: (req: any, _res, buf: Buffer) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: true }));

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

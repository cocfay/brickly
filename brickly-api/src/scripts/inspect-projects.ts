import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from '../app.module';
import { Project } from '../projects/schemas/project.schema';

const logger = new Logger('InspectProjects');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const projectModel = app.get<Model<Project>>(getModelToken(Project.name));
    const projects = await projectModel.find({}).lean();

    for (const p of projects) {
      logger.log(`━━━ ${p.title} (${p._id})`);
      logger.log(`  status: ${p.status}`);
      logger.log(`  projectSlug: ${p.projectSlug}`);
      logger.log(`  type: ${p.type} | mode: ${p.mode} | priceFromQ: ${p.priceFromQ} | priceFromUSD: ${p.priceFromUSD} | rate: ${p.rate}`);
      logger.log(`  mainImage: ${p.mainImage}`);
      logger.log(`  mainImageAlter: ${p.mainImageAlter}`);
      logger.log(`  images: ${JSON.stringify(p.images || [])}`);
      logger.log(`  location: ${JSON.stringify(p.location || {})}`);
      logger.log(`  areas: ${JSON.stringify(p.areas || {})}`);
      logger.log(`  estructura: ${JSON.stringify(p.estructura || {})}`);
      logger.log(`  amenities: ${JSON.stringify(p.amenities ? Object.keys(p.amenities) : [])}`);
      logger.log(`  tour360: ${p.tour360}`);
      logger.log(`  modelos: ${(p.models || []).length} → ${JSON.stringify((p.models || []).map(m => ({ nombre: m.nombre, tipo: m.tipo, precioQ: m.precioDesdeQ, area: m.areas?.areaConstruccionM2, fotos: (m.fotos || []).length, distrib: m.distribucion ? Object.keys(m.distribucion).filter(k => m.distribucion[k]) : [] })))}`);
    }
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  logger.error(error);
  process.exit(1);
});

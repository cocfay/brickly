import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from '../app.module';
import { Property } from '../properties/schemas/property.schema';

const logger = new Logger('BackfillPropertySlugs');

const reservedPropertySlugs = new Set([
  'metricas',
  'metricas-adm',
  'var-ranges',
  'count',
  'add',
  'edit',
  'view',
  'planes',
  'propiedad',
  'propiedades',
  'api',
]);

function normalizePropertySlug(value: string) {
  const base = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 100)
    .replace(/-+$/g, '');

  const slug = base || 'propiedad';
  return reservedPropertySlugs.has(slug) ? `${slug}-propiedad` : slug;
}

function getPropertySlugSource(property: any) {
  return property?.market?.title || property?.folderId || 'propiedad';
}

async function ensureUniquePropertySlug(
  propertyModel: Model<Property>,
  value: string,
  propertyId: string,
) {
  const baseSlug = normalizePropertySlug(value);
  let candidate = baseSlug;
  let suffix = 2;

  while (
    await propertyModel.exists({
      propertySlug: candidate,
      _id: { $ne: propertyId },
    })
  ) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const propertyModel = app.get<Model<Property>>(getModelToken(Property.name));

    const cursor = propertyModel
      .find({
        $or: [
          { propertySlug: { $exists: false } },
          { propertySlug: null },
          { propertySlug: '' },
        ],
      })
      .cursor();

    let scanned = 0;
    let updated = 0;

    for await (const property of cursor) {
      scanned += 1;

      const propertyId = property._id.toString();
      const propertySlug = await ensureUniquePropertySlug(
        propertyModel,
        getPropertySlugSource(property),
        propertyId,
      );

      await propertyModel.updateOne(
        { _id: property._id },
        { $set: { propertySlug } },
      );
      updated += 1;

      logger.log(`${propertyId} -> ${propertySlug}`);
    }

    await propertyModel.collection.createIndex(
      { propertySlug: 1 },
      {
        unique: true,
        sparse: true,
        background: true,
        name: 'propertySlug_1',
      },
    );

    logger.log(`Propiedades revisadas: ${scanned}`);
    logger.log(`Slugs generados: ${updated}`);
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  logger.error(error);
  process.exit(1);
});

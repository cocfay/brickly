import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from '../app.module';
import { User } from '../users/user.schema';

const logger = new Logger('BackfillProfileSlugs');

const reservedProfileSlugs = new Set([
  'add',
  'admin',
  'agencia',
  'agencias',
  'agente',
  'agentes',
  'api',
  'arquitecto',
  'arquitectos',
  'cpanel',
  'edit',
  'easybroker',
  'favorites',
  'home',
  'list-user',
  'list-user-me',
  'login',
  'me',
  'perfil',
  'profile',
  'propiedad',
  'propiedades',
  'registro',
  'users',
]);

function normalizeProfileSlug(value: string) {
  const base = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 80)
    .replace(/-+$/g, '');

  const slug = base || 'usuario';
  return reservedProfileSlugs.has(slug) ? `${slug}-perfil` : slug;
}

function getProfileSlugSource(user: any) {
  return user?.name || user?.email?.split?.('@')?.[0] || 'usuario';
}

async function ensureUniqueProfileSlug(
  userModel: Model<User>,
  value: string,
  userId: string,
) {
  const baseSlug = normalizeProfileSlug(value);
  let candidate = baseSlug;
  let suffix = 2;

  while (
    await userModel.exists({
      profileSlug: candidate,
      _id: { $ne: userId },
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
    const userModel = app.get<Model<User>>(getModelToken(User.name));

    const cursor = userModel
      .find({
        $or: [
          { profileSlug: { $exists: false } },
          { profileSlug: null },
          { profileSlug: '' },
        ],
      })
      .cursor();

    let scanned = 0;
    let updated = 0;

    for await (const user of cursor) {
      scanned += 1;

      const userId = user._id.toString();
      const profileSlug = await ensureUniqueProfileSlug(
        userModel,
        getProfileSlugSource(user),
        userId,
      );

      await userModel.updateOne(
        { _id: user._id },
        { $set: { profileSlug } },
      );
      updated += 1;

      logger.log(`${userId} -> ${profileSlug}`);
    }

    await userModel.collection.createIndex(
      { profileSlug: 1 },
      {
        unique: true,
        sparse: true,
        background: true,
        name: 'profileSlug_1',
      },
    );

    logger.log(`Usuarios revisados: ${scanned}`);
    logger.log(`Slugs generados: ${updated}`);
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  logger.error(error);
  process.exit(1);
});

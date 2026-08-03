import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from '../app.module';
import { Project } from '../projects/schemas/project.schema';

const logger = new Logger('BackfillModelSlugs');

function normalizeModelSlug(value: string) {
  const base = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 100)
    .replace(/-+$/g, '');

  return base || 'modelo';
}

function ensureUniqueModelSlug(models: any[], value: string, excludeIndex = -1) {
  const baseSlug = normalizeModelSlug(value);
  let candidate = baseSlug;
  let suffix = 2;
  const taken = new Set<string>();

  (models || []).forEach((m, i) => {
    if (i !== excludeIndex && m?.modelSlug) {
      taken.add(m.modelSlug);
    }
  });

  while (taken.has(candidate)) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function assignModelSlugs(models: any[]) {
  const list = models || [];
  return list.map((m, index) => {
    const source = m?.modelSlug || m?.nombre || `modelo-${index + 1}`;
    const modelSlug = ensureUniqueModelSlug(list, source, index);
    return { ...(m || {}), modelSlug };
  });
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const projectModel = app.get<Model<Project>>(getModelToken(Project.name));

    const projects = await projectModel.find({}).lean();

    let projectsUpdated = 0;
    let modelsUpdated = 0;

    for (const project of projects) {
      const models = assignModelSlugs(project.models || []);
      const changed = models.some(
        (m, i) => m.modelSlug !== (project.models?.[i]?.modelSlug || undefined),
      );

      if (changed) {
        await projectModel.updateOne(
          { _id: project._id },
          { $set: { models } },
        );
        projectsUpdated += 1;
        modelsUpdated += models.length;
        logger.log(
          `${project.title} -> modelos: ${models
            .map((m) => `${m.nombre}=${m.modelSlug}`)
            .join(', ')}`,
        );
      }
    }

    logger.log(`Proyectos actualizados: ${projectsUpdated}`);
    logger.log(`Modelos con slug: ${modelsUpdated}`);
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  logger.error(error);
  process.exit(1);
});

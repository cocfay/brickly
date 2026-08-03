import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from '../app.module';
import { Project } from '../projects/schemas/project.schema';

const logger = new Logger('BackfillProjectSlugs');

const reservedProjectSlugs = new Set([
  'add',
  'edit',
  'view',
  'favoritos',
  'piso',
  'apartamento',
  'proyecto',
  'proyectos',
  'api',
]);

function normalizeProjectSlug(value: string) {
  const base = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 100)
    .replace(/-+$/g, '');

  const slug = base || 'proyecto';
  return reservedProjectSlugs.has(slug) ? `${slug}-proyecto` : slug;
}

function getProjectSlugSource(project: any) {
  return project?.title || project?.address || 'proyecto';
}

async function ensureUniqueProjectSlug(
  projectModel: Model<Project>,
  value: string,
  projectId: string,
) {
  const baseSlug = normalizeProjectSlug(value);
  let candidate = baseSlug;
  let suffix = 2;

  while (
    await projectModel.exists({
      projectSlug: candidate,
      _id: { $ne: projectId },
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
    const projectModel = app.get<Model<Project>>(getModelToken(Project.name));

    const projects = await projectModel.find({}).lean();

    let slugsGenerated = 0;
    let statusFixed = 0;

    for (const project of projects) {
      const projectId = project._id.toString();
      const updates: any = {};

      if (!project.projectSlug) {
        updates.projectSlug = await ensureUniqueProjectSlug(
          projectModel,
          getProjectSlugSource(project),
          projectId,
        );
        slugsGenerated += 1;
      }

      if (!project.status) {
        updates.status = 'published';
        statusFixed += 1;
      }

      if (Object.keys(updates).length > 0) {
        await projectModel.updateOne({ _id: project._id }, { $set: updates });
        logger.log(`${project.title} -> ${JSON.stringify(updates)}`);
      }
    }

    await projectModel.collection.createIndex(
      { projectSlug: 1 },
      {
        unique: true,
        sparse: true,
        background: true,
        name: 'projectSlug_1',
      },
    );

    logger.log(`Slugs generados: ${slugsGenerated}`);
    logger.log(`Status asignados: ${statusFixed}`);
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  logger.error(error);
  process.exit(1);
});

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from '../app.module';
import { Project } from '../projects/schemas/project.schema';

const logger = new Logger('RecycleProjectImages');

// Imágenes que estaban hardcodeadas en el frontend (src/assets/images/proyecto e imagenes_de_casas)
const PROJECT_MAIN = [
  'edificio.png',
  'AP.png',
  'RP.png',
  'PP.png',
  'M1.png',
];

const PROJECT_GALLERY = [
  'T1.png',
  'T2.png',
  'T3.png',
  'T4.png',
  'A1.png',
  'A2.png',
  'A3.png',
  'R1.png',
  'R2.png',
  'R3.png',
  'img7.webp',
  'img9.webp',
  'Casa1.webp',
  'Casa2.webp',
];

const MODEL_IMAGES = [
  'Modelo1.png',
  'Modelo2.png',
  'Modelo3.png',
  'M2.png',
  'M3.png',
  'M4.png',
];

const SRC_PROYECTO = path.resolve(
  __dirname,
  '../../../frontend-brickly/src/assets/images/proyecto',
);
const SRC_CASAS = path.resolve(
  __dirname,
  '../../../frontend-brickly/src/assets/images/imagenes_de_casas',
);
const DEST_DIR = path.resolve(process.cwd(), 'uploads/assets/proyectos');

function dbPathToDisk(dbPath: string) {
  // Rutas "assets/..." y "/uploads/..." corresponden a la carpeta uploads/ del backend
  const clean = String(dbPath).replace(/^\//, '');
  if (clean.startsWith('assets/')) {
    return path.resolve(process.cwd(), 'uploads', clean);
  }
  return path.resolve(process.cwd(), clean);
}

function isPlaceholder(url?: string) {
  if (
    !url ||
    url.includes('miapp.com') ||
    url.startsWith('uploads/temp') ||
    url.startsWith('https://placeholder')
  ) {
    return true;
  }
  // URLs absolutas externas: no se pueden validar localmente, se conservan
  if (/^https?:\/\//i.test(url)) return false;
  // Rutas relativas: son imágenes rotas si el archivo no existe en disco
  return !fs.existsSync(dbPathToDisk(url));
}

function copyAsset(srcDir: string, fileName: string) {
  const source = path.join(srcDir, fileName);
  const destination = path.join(DEST_DIR, fileName);
  if (!fs.existsSync(source)) {
    logger.warn(`No existe ${source}`);
    return false;
  }
  if (!fs.existsSync(destination)) {
    fs.copyFileSync(source, destination);
    logger.log(`Copiada: ${fileName}`);
  }
  return true;
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const projectModel = app.get<Model<Project>>(getModelToken(Project.name));

    fs.mkdirSync(DEST_DIR, { recursive: true });

    // 1) Copiar imágenes al backend (idempotente)
    [...PROJECT_MAIN, ...PROJECT_GALLERY, ...MODEL_IMAGES].forEach((f) => {
      copyAsset(
        f.endsWith('.webp') ? SRC_CASAS : SRC_PROYECTO,
        f,
      );
    });

    // 2) Asignar imágenes a proyectos y modelos
    const projects = await projectModel.find({}).sort({ createdAt: 1 }).lean();

    let projectsUpdated = 0;
    let modelsUpdated = 0;

    for (let i = 0; i < projects.length; i++) {
      const project = projects[i];
      const updates: any = {};

      const mainPath = `assets/proyectos/${PROJECT_MAIN[i % PROJECT_MAIN.length]}`;
      if (isPlaceholder(project.mainImage)) {
        updates.mainImage = mainPath;
      }

      const galleryCount = Math.min(3, PROJECT_GALLERY.length);
      const galleryStart = (i * 2) % PROJECT_GALLERY.length;
      const gallery = Array.from({ length: galleryCount }, (_, k) => {
        const file = PROJECT_GALLERY[(galleryStart + k) % PROJECT_GALLERY.length];
        return `assets/proyectos/${file}`;
      });
      const currentImages: string[] = project.images || [];
      const allPlaceholders =
        currentImages.length === 0 || currentImages.every(isPlaceholder);
      if (allPlaceholders) {
        updates.images = gallery;
      }

      const currentModels = project.models || [];
      const newModels = currentModels.map((m, j) => {
        const fotos: string[] = m.fotos || [];
        const hasRealFotos = fotos.some((f) => !isPlaceholder(f));
        if (!hasRealFotos) {
          const file = MODEL_IMAGES[(i * 3 + j) % MODEL_IMAGES.length];
          return { ...m, fotos: [`assets/proyectos/${file}`] };
        }
        return m;
      });
      const modelsChanged = newModels.some(
        (m, j) => JSON.stringify(m.fotos) !== JSON.stringify(currentModels[j]?.fotos),
      );
      if (modelsChanged) {
        updates.models = newModels;
      }

      if (Object.keys(updates).length > 0) {
        await projectModel.updateOne({ _id: project._id }, { $set: updates });
        projectsUpdated += 1;
        modelsUpdated += currentModels.length;
        logger.log(
          `${project.title} -> main=${updates.mainImage || '(conservado)'} fotosModelos=${(updates.models || currentModels).map((m) => m.fotos?.[0] || '—').join(' | ')}`,
        );
      }
    }

    logger.log(`Proyectos actualizados: ${projectsUpdated}`);
    logger.log(`Modelos con fotos: ${modelsUpdated}`);
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  logger.error(error);
  process.exit(1);
});

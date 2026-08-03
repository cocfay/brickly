import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from '../app.module';
import { Project } from '../projects/schemas/project.schema';

const logger = new Logger('AddModelsToProjects');

const DEFAULT_RATE = 7.8;

const GASTOS_FIJOS_APARTAMENTO = {
  tipoEstufa: 'Gas Propano (Tambo)',
  servicioAgua: 'Público',
};

const GASTOS_FIJOS_BODEGA = {
  tipoEstufa: 'Inducción',
  servicioAgua: 'Pozo propio del condominio',
};

const DISTRIBUCION_APARTAMENTO_BASE = {
  totalAmbientes: '3',
  dormitorios: '2',
  banosCompletos: '2',
  mediosBanos: '1',
  habitacionServicio: 'Con baño propio',
  pergolaDeck: 'Si',
  parqueo: '2',
  amueblado: 'No',
  areaLavanderia: 'Techada',
  estudioOficina: 'No',
  salaFamiliar: 'Sala/Comedor integrados',
};

const DISTRIBUCION_BODEGA_BASE = {
  totalAmbientes: '3',
  oficina: 'Si',
  banosCompletos: '2',
  mediosBanos: '0',
  habitacionServicio: 'Solo habitación',
  areaDescarga: 'Si',
  helipuerto: 'No',
  mezzanine: 'No',
};

const APARTAMENTO_TIERS = [
  { areaConstruccionM2: '75', espacioAlmacenamiento: '4 m²', nombre: 'Modelo A' },
  { areaConstruccionM2: '95', espacioAlmacenamiento: '5 m²', nombre: 'Modelo B' },
  { areaConstruccionM2: '120', espacioAlmacenamiento: '7 m²', nombre: 'Modelo C' },
];

const BODEGA_TIERS = [
  { areaConstruccionM2: '150', espacioAlmacenamiento: '20 m²', nombre: 'Modelo A' },
  { areaConstruccionM2: '200', espacioAlmacenamiento: '30 m²', nombre: 'Modelo B' },
  { areaConstruccionM2: '260', espacioAlmacenamiento: '40 m²', nombre: 'Modelo C' },
];

const STOPWORDS = ['de', 'la', 'el', 'las', 'los', 'del', 'al', 'y', 'san', 'santa', 'don'];

function shortTitle(title: string) {
  const words = String(title || '')
    .trim()
    .split(/\s+/)
    .filter((w) => !STOPWORDS.includes(w.toLowerCase()));
  if (words.length <= 2) return words.join(' ');
  return words.slice(0, 2).join(' ');
}

function pickTipo(projectType: string) {
  const t = String(projectType || '').toLowerCase();
  if (t.includes('bodega') || t.includes('comercial')) return 'Bodega';
  return 'Apartamento';
}

function buildModels(project: any) {
  const tipo = pickTipo(project.type);
  const rate = parseFloat(project.rate) || DEFAULT_RATE;
  const precioBaseQ = parseFloat(project.priceFromQ) || 350000;
  const precioBaseUSD = parseFloat(project.priceFromUSD) || Math.round(precioBaseQ / rate);

  const tiers = tipo === 'Bodega' ? BODEGA_TIERS : APARTAMENTO_TIERS;
  const distribucion = tipo === 'Bodega' ? DISTRIBUCION_BODEGA_BASE : DISTRIBUCION_APARTAMENTO_BASE;
  const gastosFijos = tipo === 'Bodega' ? GASTOS_FIJOS_BODEGA : GASTOS_FIJOS_APARTAMENTO;
  const alturaCielo = tipo === 'Bodega' ? '5.50 m' : '3.00 m';
  const mantenimientoUSD = tipo === 'Bodega' ? 120 : 50;

  const prefix = shortTitle(project.title) || 'Proyecto';

  return tiers.map((tier, idx) => {
    const factor = 1 + idx * 0.25;
    const precioQ = Math.round((precioBaseQ * factor) / 1000) * 1000;
    const precioUSD = Math.round(precioQ / rate);
    return {
      tipo,
      nombre: `${prefix} ${tier.nombre}`,
      precioDesdeQ: precioQ,
      tasa: rate,
      precioDesdeUSD: precioUSD,
      descripcion:
        `Modelo ${tier.nombre} de ${project.title}. Incluye acabados de primera, ` +
        `área de construcción de ${tier.areaConstruccionM2} m² y amenidades del proyecto.`,
      areas: {
        areaConstruccionM2: tier.areaConstruccionM2,
        espacioAlmacenamiento: tier.espacioAlmacenamiento,
      },
      estructura: { alturaCielo },
      distribucion: { ...distribucion },
      gastosFijos: {
        ...gastosFijos,
        mantenimientoUSD,
        mantenimientoQ: Math.round(mantenimientoUSD * rate),
      },
      incluye: { iusi: 'Anual' },
      fotos: [],
      tour360: project.tour360 || '',
    };
  });
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const projectModel = app.get<Model<Project>>(getModelToken(Project.name));

    const dryRun = process.env.DRY_RUN === '1';
    const projects = await projectModel.find({}).sort({ createdAt: -1 }).lean();

    logger.log(`Proyectos encontrados: ${projects.length} (${dryRun ? 'DRY RUN' : 'EJECUTANDO'})`);

    let updated = 0;
    let skipped = 0;

    for (const project of projects) {
      const existing = (project.models || []).length;
      if (existing > 0) {
        skipped += 1;
        logger.log(`SKIP ${project._id} - ${project.title} (ya tiene ${existing} modelos)`);
        continue;
      }

      const models = buildModels(project);
      logger.log(
        `> ${project._id} - ${project.title} [tipo=${project.type || 'Apartamento'}, ` +
        `precioQ=${project.priceFromQ}, rate=${project.rate}] -> ` +
        models.map((m) => `${m.nombre} (${m.tipo}) Q${m.precioDesdeQ}`).join(' | '),
      );

      if (!dryRun) {
        await projectModel.updateOne(
          { _id: project._id },
          { $set: { models } },
        );
        updated += 1;
      }
    }

    logger.log(`Proyectos actualizados: ${updated}`);
    logger.log(`Proyectos omitidos (ya tenían modelos): ${skipped}`);
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  logger.error(error);
  process.exit(1);
});

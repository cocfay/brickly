import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Property } from '../properties/schemas/property.schema';
import { User } from '../users/user.schema';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PhotoCleanupService {
  constructor(
    @InjectModel(Property.name)
    private propertyModel: Model<Property>,
    @InjectModel(User.name)
    private userModel: Model<User>,
  ) {}

  async run({ dryRun = false }: { dryRun?: boolean } = {}) {
    const uploadsPhotosRoot = path.join(
      process.cwd(),
      'uploads',
      'properties',
      'photos',
    );

    const startedAt = new Date().toISOString();
    console.log(
      `[FOTO-CLEANUP] ${dryRun ? 'DRY-RUN ' : ''}Inicio: ${startedAt} (raíz: ${uploadsPhotosRoot})`,
    );

    const properties = await this.propertyModel
      .find({})
      .select(
        'folderId userId easyBrokerId propertySlug market.title media.photos',
      )
      .lean();

    // precargar nombres/emails de las inmobiliarias (usuarios)
    const userIds = [
      ...new Set(
        properties
          .map((p) => String(p.userId || ''))
          .filter(Boolean),
      ),
    ];

    const users = userIds.length
      ? await this.userModel
          .find({ _id: { $in: userIds } })
          .select('name email')
          .lean()
      : [];

    const userInfo = new Map<
      string,
      { name: string; email: string }
    >();
    for (const u of users) {
      userInfo.set(String(u._id), {
        name: String(u.name || ''),
        email: String(u.email || ''),
      });
    }

    let propertiesScanned = 0;
    let propertiesProcessed = 0;
    let propertiesWithDeletions = 0;
    let filesDeleted = 0;

    const companies = new Map<
      string,
      {
        userId: string;
        name: string;
        email: string;
        filesDeleted: number;
        properties: {
          title: string;
          folderId: string;
          easyBrokerId: string;
          deletedFiles: string[];
        }[];
      }
    >();

    for (const property of properties) {
      const userId = String(property.userId || '');
      const folderId = property.folderId
        ? String(property.folderId)
        : '';

      const title =
        String(
          (property.market as any)?.title || '',
        ) ||
        String(
          (property as any).propertySlug || '',
        ) ||
        String(property.easyBrokerId || '') ||
        String((property as any)._id || '');

      // set de nombres de archivo referenciados en BD
      const referenced = new Set<string>();
      // carpetas físicas donde viven las fotos (derivadas de los paths)
      const folders = new Set<string>();
      const photos = Array.isArray(
        (property.media as any)?.photos,
      )
        ? (property.media as any).photos
        : [];

      for (const photo of photos) {
        if (photo?.path) {
          referenced.add(
            path.basename(String(photo.path)),
          );
          folders.add(
            path.posix.dirname(
              String(photo.path),
            ),
          );
        }

        if (photo?.thumbnail) {
          referenced.add(
            path.basename(String(photo.thumbnail)),
          );
          folders.add(
            path.posix.dirname(
              String(photo.thumbnail),
            ),
          );
        }
      }

      // respaldo: si no se pudieron derivar rutas, usar userId/folderId
      if (folders.size === 0 && userId && folderId) {
        folders.add(
          path.posix.join(
            'properties',
            'photos',
            userId,
            folderId,
          ),
        );
      }

      if (folders.size === 0) continue;

      propertiesScanned++;

      const deletedFiles: string[] = [];
      let anyFolderRead = false;

      for (const relativeFolder of folders) {
        if (!relativeFolder) continue;

        const folderPath = path.join(
          uploadsPhotosRoot,
          relativeFolder.replace(
            /^properties\/photos\//,
            '',
          ),
        );

        if (!fs.existsSync(folderPath)) continue;

        let entries: fs.Dirent[] = [];
        try {
          entries = fs.readdirSync(folderPath, {
            withFileTypes: true,
          });
          anyFolderRead = true;
        } catch (error) {
          console.error(
            `[FOTO-CLEANUP] Error leyendo carpeta ${folderPath}`,
            error,
          );
          continue;
        }

        for (const entry of entries) {
          if (!entry.isFile()) continue;
          if (referenced.has(entry.name)) continue;

          const fullPath = path.join(
            folderPath,
            entry.name,
          );

          if (!dryRun) {
            try {
              fs.unlinkSync(fullPath);
            } catch (error) {
              console.error(
                `[FOTO-CLEANUP] No se pudo eliminar ${fullPath}`,
                error,
              );
              continue;
            }
          }

          deletedFiles.push(entry.name);
          filesDeleted++;
        }
      }

      if (!anyFolderRead) continue;

      propertiesProcessed++;

      if (deletedFiles.length === 0) continue;

      const info = userInfo.get(userId) || {
        name: 'Desconocida',
        email: '',
      };

      propertiesWithDeletions++;

      console.log(
        `[FOTO-CLEANUP] ${dryRun ? '[DRY-RUN] ' : ''}Empresa: ${info.name} <${info.email}> (${userId}) | Propiedad: "${title}" (folder ${folderId}, easyBroker: ${property.easyBrokerId || '-'}) | Eliminadas: ${deletedFiles.length} | ${deletedFiles.join(', ')}`,
      );

      const company = companies.get(userId) || {
        userId,
        name: info.name,
        email: info.email,
        filesDeleted: 0,
        properties: [],
      };

      company.filesDeleted += deletedFiles.length;
      company.properties.push({
        title,
        folderId,
        easyBrokerId: String(
          property.easyBrokerId || '',
        ),
        deletedFiles,
      });

      companies.set(userId, company);
    }

    console.log(
      `[FOTO-CLEANUP] ${dryRun ? '[DRY-RUN] ' : ''}Resumen: ${propertiesScanned} propiedad(es) escaneadas, ${propertiesProcessed} con carpeta, ${propertiesWithDeletions} con archivos huérfanos, ${filesDeleted} archivo(s) eliminado(s)`,
    );

    for (const company of companies.values()) {
      console.log(
        `[FOTO-CLEANUP] ${dryRun ? '[DRY-RUN] ' : ''}Resumen empresa: ${company.name} <${company.email}> (${company.userId}) -> ${company.filesDeleted} archivo(s), ${company.properties.length} propiedad(es)`,
      );
    }

    console.log(
      `[FOTO-CLEANUP] ${dryRun ? '[DRY-RUN] ' : ''}Fin: ${new Date().toISOString()}`,
    );

    return {
      message: dryRun
        ? 'Simulación de limpieza completada (no se eliminó nada)'
        : 'Limpieza de fotos completada',
      startedAt,
      dryRun,
      propertiesScanned,
      propertiesProcessed,
      propertiesWithDeletions,
      filesDeleted,
      companies: [...companies.values()].map((c) => ({
        ...c,
        properties: c.properties.map((p) => ({
          ...p,
          deletedCount: p.deletedFiles.length,
        })),
      })),
    };
  }
}
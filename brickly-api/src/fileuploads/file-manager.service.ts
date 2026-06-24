import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import sharp from 'sharp';

@Injectable()
export class FileManagerService {
  moveFromTemp(filePath: string, targetFolder: string) {
     if (!filePath) return filePath;
    if (!filePath.startsWith('temp/')) return filePath;

    const fileName = path.basename(filePath);

    const uploadsRoot = path.join(process.cwd(), 'uploads');

    const source = path.join(uploadsRoot, filePath);
    const destination = path.join(uploadsRoot, targetFolder, fileName);

    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.renameSync(source, destination);

    const relativePath = path.join(targetFolder, fileName).replace(/\\/g, '/');

    return relativePath;
  }
  async moveAndOptimizeFromTemp(
        filePath: string,
        targetFolder: string,
      ) {

        if (!filePath) {
          return null;
        }

        if (!filePath.startsWith('temp/')) {

          let thumbnail = '';

          if (
            filePath.toLowerCase().endsWith('.webp')
          ) {

            thumbnail = filePath.replace(
              /\.webp$/i,
              '_thumb.webp',
            );
          }

          return {
            path: filePath,
            thumbnail,
          };
        }

        const uploadsRoot = path.join(
          process.cwd(),
          'uploads',
        );

        const source = path.join(
          uploadsRoot,
          filePath,
        );

        if (!fs.existsSync(source)) {
          throw new Error(
            `Archivo temporal no encontrado: ${source}`,
          );
        }

        // nombre base
        const originalName = path.basename(
          filePath,
          path.extname(filePath),
        );

        const safeName =
          `${Date.now()}-${originalName}`;

        // carpeta destino
        const destinationDir = path.join(
          uploadsRoot,
          targetFolder,
        );

        fs.mkdirSync(destinationDir, {
          recursive: true,
        });

        // archivos finales
        const webpDestination = path.join(
          destinationDir,
          `${safeName}.webp`,
        );

        const thumbDestination = path.join(
          destinationDir,
          `${safeName}_thumb.webp`,
        );

        // convertir a webp
        await sharp(source)
          .webp({
            quality: 80,
          })
          .toFile(webpDestination);

        // generar thumbnail
        await sharp(source)
          .resize({
            width: 400,
            withoutEnlargement: true,
          })
          .webp({
            quality: 70,
          })
          .toFile(thumbDestination);

        // eliminar temporal
        fs.unlinkSync(source);

        return {
          path: path
            .join(
              targetFolder,
              `${safeName}.webp`,
            )
            .replace(/\\/g, '/'),

          thumbnail: path
            .join(
              targetFolder,
              `${safeName}_thumb.webp`,
            )
            .replace(/\\/g, '/'),
        };
  }
  async downloadRemoteFile(
        fileUrl: string,
        targetFolder: string,
      ): Promise<string> {
        const uploadsRoot = path.join(
          process.cwd(),
          'uploads',
        );

        const fileName =
          Date.now() +
          '-' +
          path.basename(fileUrl.split('?')[0]);

        const destination = path.join(
          uploadsRoot,
          targetFolder,
          fileName,
        );

        fs.mkdirSync(
          path.dirname(destination),
          { recursive: true },
        );

        const response = await axios({
          method: 'GET',
          url: fileUrl,
          responseType: 'stream',
        });

        const writer =
          fs.createWriteStream(destination);

        response.data.pipe(writer);

        await new Promise<void>((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });

        return path
          .join(targetFolder, fileName)
          .replace(/\\/g, '/');
      }
  async deleteFolder(folderPath: string) {
      const fs = require('fs');
      const path = require('path');

      const fullPath = path.join(
        process.cwd(),
        folderPath,
      );

      if (fs.existsSync(fullPath)) {
        fs.rmSync(fullPath, {
          recursive: true,
          force: true,
        });
      }
    }
  
  async optimizeImage(
        relativePath: string,
      ) {

        const uploadsRoot = path.join(
          process.cwd(),
          'uploads',
        );

        const originalPath = path.join(
          uploadsRoot,
          relativePath,
        );

        // validar existencia
        if (!fs.existsSync(originalPath)) {
          throw new Error(
            `Archivo no encontrado: ${originalPath}`,
          );
        }

        const ext = path.extname(originalPath)
          .toLowerCase();

        const dir = path.dirname(originalPath);

        const filename = path.basename(
          originalPath,
          ext,
        );

        // paths nuevos
        const webpPath = path.join(
          dir,
          `${filename}.webp`,
        );

        const thumbPath = path.join(
          dir,
          `${filename}_thumb.webp`,
        );

        // convertir a webp si no es webp
        if (ext !== '.webp') {

          await sharp(originalPath)
            .webp({
              quality: 80,
            })
            .toFile(webpPath);

          // eliminar original
          fs.unlinkSync(originalPath);

        } else {

          // si ya es webp usar original
          if (originalPath !== webpPath) {

            fs.copyFileSync(
              originalPath,
              webpPath,
            );
          }
        }

        // generar thumbnail
        await sharp(webpPath)
          .resize({
            width: 400,
            withoutEnlargement: true,
          })
          .webp({
            quality: 70,
          })
          .toFile(thumbPath);

        return {
          path: path
            .relative(
              uploadsRoot,
              webpPath,
            )
            .replace(/\\/g, '/'),

          thumbnail: path
            .relative(
              uploadsRoot,
              thumbPath,
            )
            .replace(/\\/g, '/'),
        };
      }

  async downloadAndOptimizeImage(
        imageUrl: string,
        folder: string,
      ) {

        const dirPath = path.join(
          process.cwd(),
          'uploads',
          folder,
        );

        // crear carpeta
        fs.mkdirSync(dirPath, {
          recursive: true,
        });

        // nombre único
        const filename =
          `${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 8)}`;

        // archivo temporal
        let extension = path.extname(
            new URL(imageUrl).pathname,
          );

          if (!extension) {
            extension = '.jpg';
          }
        const tempPath = path.join(
            dirPath,
            `${filename}${extension}`,
          );

        // descargar imagen
        const response = await axios({
          method: 'GET',
          url: imageUrl,
          responseType: 'arraybuffer',
        });

        fs.writeFileSync(
          tempPath,
          response.data,
        );

        // paths finales
        const webpPath = path.join(
          dirPath,
          `${filename}.webp`,
        );

        const thumbPath = path.join(
          dirPath,
          `${filename}_thumb.webp`,
        );

        // convertir a webp
        await sharp(tempPath)
          .webp({
            quality: 80,
          })
          .toFile(webpPath);

        // generar thumbnail
        await sharp(tempPath)
          .resize({
            width: 400,
            withoutEnlargement: true,
          })
          .webp({
            quality: 70,
          })
          .toFile(thumbPath);

        // eliminar temporal
        fs.unlinkSync(tempPath);

        return {
          path: path
            .relative(path.join(process.cwd(),'uploads'), webpPath)
            .replace(/\\/g, '/'),

          thumbnail: path
            .relative(path.join(process.cwd(),'uploads'), thumbPath)
            .replace(/\\/g, '/'),
        };
      }
}
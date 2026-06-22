import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  Body,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage, memoryStorage } from 'multer';
import { extname, join } from 'path';
import sharp from 'sharp';
import * as fs from 'fs';

@Controller('fileuploads')
export class FileuploadsController {

  @Post('temp')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'image', maxCount: 10 },
        { name: 'doc', maxCount: 5 },
        { name: 'video', maxCount: 5 },
        { name: 'tour', maxCount: 5 },
      ],
      {
        storage: memoryStorage(), 
        fileFilter: (req, file, callback) => {

          if (file.fieldname === 'image') {
            if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
              return callback(
                new BadRequestException('Solo se permiten imágenes'),
                false,
              );
            }
          }

          if (file.fieldname === 'doc') {
            if (!file.mimetype.match(/\/(pdf|doc|docx|csv|xls|xlsx)$/)) {
              return callback(
                new BadRequestException('Solo se permiten documentos'),
                false,
              );
            }
          }

          if (file.fieldname === 'video') {
            if (!file.mimetype.match(/\/(mp4|webm|ogg|quicktime|x-msvideo)$/)) {
              return callback(
                new BadRequestException('Solo se permiten videos'),
                false,
              );
            }
          }

          callback(null, true);
        },
        limits: {
          fileSize: 20 * 1024 * 1024,
        },
      },
    ),
  )
  async uploadTemp(
    @UploadedFiles()
    files: {
      image?: Express.Multer.File[];
      doc?: Express.Multer.File[];
      video?: Express.Multer.File[];
      tour?: Express.Multer.File[];
    },
  ) {

    if (!files.image && !files.doc && !files.video && !files.tour) {
      throw new BadRequestException('No se enviaron archivos');
    }

    const filesRT: Record<string, any> = {};

    const tempDir = join(process.cwd(), 'uploads/temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    if (files.image) {
      filesRT.image = await Promise.all(
        files.image.map(async (file) => {
          const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
          const outputPath = join(tempDir, filename);

          await sharp(file.buffer)
            .webp({ quality: 80 })
            .toFile(outputPath);

          return {
            filename,
            mimetype: 'image/webp',
            path: `uploads/temp/${filename}`,
            usepath: `temp/${filename}`,
          };
        }),
      );
    }

    if (files.doc) {
      filesRT.doc = files.doc.map((file) => {
        const filename =
        `${Date.now()}-${Math.round(Math.random() * 1e9)}` +
        extname(file.originalname);
        const outputPath = join(tempDir, filename);
        fs.writeFileSync(outputPath, file.buffer);

        return {
          filename,
          mimetype: file.mimetype,
          path: `uploads/temp/${filename}`,
          usepath: `temp/${filename}`,
        };
      });
    }

    if (files.video) {
      filesRT.video = files.video.map((file) => {
        const filename =
        `${Date.now()}-${Math.round(Math.random() * 1e9)}` +
        extname(file.originalname);
        const outputPath = join(tempDir, filename);
        fs.writeFileSync(outputPath, file.buffer);

        return {
          filename,
          mimetype: file.mimetype,
          path: `uploads/temp/${filename}`,
          usepath: `temp/${filename}`,
        };
      });
    }

    if (files.tour) {
      filesRT.tour = files.tour.map((file) => {
        const filename =
        `${Date.now()}-${Math.round(Math.random() * 1e9)}` +
        extname(file.originalname);
        const outputPath = join(tempDir, filename);
        fs.writeFileSync(outputPath, file.buffer);

        return {
          filename,
          mimetype: file.mimetype,
          path: `uploads/temp/${filename}`,
          usepath: `temp/${filename}`,
        };
      });
    }

    return {
      message: 'Archivos cargados correctamente',
      files: filesRT,
    };
  }

  @Post('save')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'image', maxCount: 10 },
        { name: 'doc', maxCount: 5 },
        { name: 'video', maxCount: 5 },
        { name: 'tour', maxCount: 5 },
      ],
      {
        storage: memoryStorage(), 
        fileFilter: (req, file, callback) => {

          if (file.fieldname === 'image') {
            if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
              return callback(
                new BadRequestException('Solo se permiten imágenes'),
                false,
              );
            }
          }

          if (file.fieldname === 'doc') {
            if (!file.mimetype.match(/\/(pdf|doc|docx|csv|xls|xlsx)$/)) {
              return callback(
                new BadRequestException('Solo se permiten documentos'),
                false,
              );
            }
          }

          if (file.fieldname === 'video') {
            if (!file.mimetype.match(/\/(mp4|webm|ogg|quicktime|x-msvideo)$/)) {
              return callback(
                new BadRequestException('Solo se permiten videos'),
                false,
              );
            }
          }

          callback(null, true);
        },
        limits: {
          fileSize: 20 * 1024 * 1024,
        },
      },
    ),
  )
  async uploadFile(
    @UploadedFiles()
    files: {
      image?: Express.Multer.File[];
      doc?: Express.Multer.File[];
      video?: Express.Multer.File[];
      tour?: Express.Multer.File[];
    },
    @Body() body: { pathsave: string }
  ) {

    if (!files.image && !files.doc && !files.video && !files.tour) {
      throw new BadRequestException('No se enviaron archivos');
    }
    if(!body.pathsave){
      throw new BadRequestException('No se envio el path de guardado');
    }

    const filesRT: Record<string, any> = {};

    const cleanPath = body.pathsave
        .replace(/^\/+|\/+$/g, '')
        .replace(/\\/g, '/');

      if (cleanPath.includes('..')) {
        throw new BadRequestException('Ruta inválida');
      }

    const normalizePath = `/${cleanPath}/`;

    const tempDir = join(process.cwd(), 'uploads/assets' + normalizePath);

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    if (files.image) {
      filesRT.image = await Promise.all(
        files.image.map(async (file) => {
          const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
          const outputPath = join(tempDir, filename);

          await sharp(file.buffer)
            .webp({ quality: 80 })
            .toFile(outputPath);

          return {
            filename,
            mimetype: 'image/webp',
            path: `uploads/assets${normalizePath}${filename}`,
            usepath: `assets${normalizePath}${filename}`,
          };
        }),
      );
    }

    if (files.doc) {
      filesRT.doc = files.doc.map((file) => {
        const filename =
        `${Date.now()}-${Math.round(Math.random() * 1e9)}` +
        extname(file.originalname);
        const outputPath = join(tempDir, filename);
        fs.writeFileSync(outputPath, file.buffer);

        return {
          filename,
          mimetype: file.mimetype,
          path: `uploads/assets${normalizePath}${filename}`,
          usepath: `assets${normalizePath}${filename}`,
        };
      });
    }

    if (files.video) {
      filesRT.video = files.video.map((file) => {
        const filename =
        `${Date.now()}-${Math.round(Math.random() * 1e9)}` +
        extname(file.originalname);
        const outputPath = join(tempDir, filename);
        fs.writeFileSync(outputPath, file.buffer);

        return {
          filename,
          mimetype: file.mimetype,
          path: `uploads/assets${normalizePath}${filename}`,
          usepath: `assets${normalizePath}${filename}`,
        };
      });
    }

    if (files.tour) {
      filesRT.tour = files.tour.map((file) => {
        const filename =
        `${Date.now()}-${Math.round(Math.random() * 1e9)}` +
        extname(file.originalname);
        const outputPath = join(tempDir, filename);
        fs.writeFileSync(outputPath, file.buffer);

        return {
          filename,
          mimetype: file.mimetype,
          path: `uploads/assets${normalizePath}${filename}`,
          usepath: `assets${normalizePath}${filename}`,
        };
      });
    }

    return {
      message: 'Archivos cargados correctamente',
      files: filesRT,
    };
  }
}
//"temp/1772131105601-547982575.png"
//"temp/1772131403874-701209446.png",
//"temp/1772134207134-182540842.png"
//"temp/1772135501144-520529469.webp"
//"temp/1772135762940-148338972.webp"
//"temp/1772135811224-652408316.webp"
import {
  Controller,
  Post,
  Query,
  Headers,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { PhotoCleanupService } from './photo-cleanup.service';

@Controller('photo-cleanup')
export class PhotoCleanupController {
  constructor(
    private readonly photoCleanupService: PhotoCleanupService,
  ) {}

  @Post('run')
  async run(
    @Headers('x-photo-cleanup-token') headerToken?: string,
    @Query('token') queryToken?: string,
    @Query('dryRun') dryRun?: string,
  ) {
    const expected = process.env
      .PHOTO_CLEANUP_TOKEN;

    if (!expected) {
      throw new ServiceUnavailableException(
        'PHOTO_CLEANUP_TOKEN no configurado en el servidor',
      );
    }

    const provided = headerToken || queryToken || '';

    if (provided !== expected) {
      throw new BadRequestException(
        'Token inválido',
      );
    }

    return this.photoCleanupService.run({
      dryRun:
        dryRun === '1' || dryRun === 'true',
    });
  }
}
import {
  Controller,
  Post,
  Param,
} from '@nestjs/common';

import { EasybrokerService } from './easybroker.service';

@Controller('easybroker')
export class EasybrokerController {
  constructor(
    private readonly easybrokerService: EasybrokerService,
  ) {}

  @Post('sync/:userId')
  sync(
    @Param('userId') userId: string,
  ) {
    return this.easybrokerService.syncUserProperties(
      userId,
    );
  }
  @Post('images-restore/:userId')
  imagerestore(
    @Param('userId') userId: string,
  ) {
    return this.easybrokerService.restorePropertyImages(
      userId,
    );
  }
  @Post('optimize-images/:userId')
  optimizeImages(
    @Param('userId') userId: string,
  ) {
    return this.easybrokerService.optimizePropertyImages(
      userId,
    );
  }
}
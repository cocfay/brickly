import { Module } from '@nestjs/common';
import { FileuploadsController } from './fileuploads.controller';
import { FileManagerService } from './file-manager.service'

@Module({
  controllers: [FileuploadsController],
   providers: [FileManagerService],
   exports: [FileManagerService],
})
export class FileuploadsModule {}
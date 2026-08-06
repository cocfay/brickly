// projects.module.ts
import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { ContactModule } from '../contact/contact.module';
import { Project, ProjectSchema } from './schemas/project.schema';
import { ProjectLead, ProjectLeadSchema } from './schemas/project-lead.schema';
import {
  ProjectCitaClick,
  ProjectCitaClickSchema,
} from './schemas/project-cita-click.schema';

@Module({
  imports: [
    ContactModule,
    MongooseModule.forFeature([
      { name: Project.name, schema: ProjectSchema },
      { name: ProjectLead.name, schema: ProjectLeadSchema },
      { name: ProjectCitaClick.name, schema: ProjectCitaClickSchema },
    ]),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
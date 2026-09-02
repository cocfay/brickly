// projects.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  Param,
  Delete,
  Req,
  Query,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/roles.enum';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.ARQUITECTO, Role.DESARROLLADORA)
  @Post()
  create(@Req() req, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(req.user.userId, dto);
  }

  @Get()
  findAll(@Query() query: any) {
    return this.projectsService.findAll(query);
  }

  @Post('lead')
  createLead(@Body() body: any) {
    return this.projectsService.createLead(body);
  }

  @Post('cita-click')
  createCitaClick(@Body() body: any) {
    return this.projectsService.createCitaClick(body);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.DESARROLLADORA, Role.ARQUITECTO)
  @Get('leads')
  findLeads(@Query() query: any) {
    return this.projectsService.findLeads(query);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.DESARROLLADORA, Role.ARQUITECTO)
  @Put('leads/status')
  updateLeadStatus(@Body() body: { ids: string[]; status: string }) {
    return this.projectsService.updateLeadStatus(body.ids, body.status);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.DESARROLLADORA, Role.ARQUITECTO)
  @Get('cita-clicks')
  findCitaClicks(@Query() query: any) {
    return this.projectsService.findCitaClicks(query);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.DESARROLLADORA, Role.ARQUITECTO)
  @Get('cita-clicks/daily')
  getCitaClicksDaily(@Query() query: any) {
    return this.projectsService.getCitaClicksDaily(query);
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.projectsService.findByUser(userId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Get('report/by-developer')
  projectsByDeveloperReport() {
    return this.projectsService.projectsByDeveloperReport();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.ARQUITECTO, Role.DESARROLLADORA)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.projectsService.update(id, body);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN, Role.ARQUITECTO, Role.DESARROLLADORA)
  @Delete(':id')
  delete(@Param('id') id: string, @Req() req) {
    return this.projectsService.delete(id, req.user);
  }
}

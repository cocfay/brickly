import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  UseGuards,
  Req,
  NotFoundException
} from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { AssingAgentPropertyDto } from './dto/assing-agent-prperty.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/roles.enum';
import { FileManagerService } from '../fileuploads/file-manager.service';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Property } from './schemas/property.schema';
import { nanoid, customAlphabet } from 'nanoid';

const folderIdGenerator =
  customAlphabet(
    'abcdefghijklmnopqrstuvwxyz0123456789',
    10,
  );

@Controller('properties')
export class PropertiesController {
 // constructor(private readonly propertiesService: PropertiesService) {}

  constructor(
    private readonly propertiesService: PropertiesService,
    @InjectModel(Property.name) private propertyModel: Model<Property>,
    private fileManager: FileManagerService,
  ) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN,Role.DESARROLLADORA,Role.AGENCIA,Role.AGENTE)
  async create(@Req() req, @Body() dto: CreatePropertyDto) {
    dto.folderId = folderIdGenerator();
    dto.media = await this.processMedia(
                                          dto.media,
                                          String(req.user.userId) + "/" + dto.folderId,
                                        );
    dto.userId = req.user.userId;
    
    if(req.user.roles.includes(Role.AGENTE)){
      dto.agents = [req.user.userId];
    }
    return this.propertiesService.create(dto);
  }

  @Post('assign-agent/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN,Role.DESARROLLADORA,Role.AGENCIA)
  async assing(@Param('id') id: string, @Req() req, @Body() dto: AssingAgentPropertyDto) {
    const propertyAssign = await this.propertiesService.findById(id);

    if (
      !propertyAssign ||
      (
        (req.user.roles.includes(Role.DESARROLLADORA) || req.user.roles.includes(Role.AGENCIA)) &&
        propertyAssign.userId.toString() !== req.user.userId
      )
    ) {
      throw new NotFoundException('Propiedad no encontrada');
    }

    return this.propertiesService.update(id,dto);
  }

  @Get()
  //@UseGuards(AuthGuard('jwt'), RolesGuard)
  //@Roles(Role.ADMIN,Role.DESARROLLADORA,Role.AGENCIA)
  findAll(@Query() query: any) {
    return this.propertiesService.findAll(query);
  }

  @Get('metricas')
  @UseGuards(AuthGuard('jwt'))
  getMetrics(@Req() req) {
    return this.propertiesService.getMetrics(req.user.userId);
  }

  @Get('metricas-adm')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  getAdmMetrics() {
    return this.propertiesService.getMetricsAdm();
  }

  @Get('var-ranges')
  getPriceRange() {
    return this.propertiesService.getPriceRange();
  }

  

  @Get(':id')
  //@UseGuards(AuthGuard('jwt'), RolesGuard)
  //@Roles(Role.ADMIN,Role.DESARROLLADORA,Role.AGENCIA)
  findOne(@Param('id') id: string) {
    return this.propertiesService.findById(id);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN,Role.DESARROLLADORA,Role.AGENCIA,Role.AGENTE)
  async update(@Param('id') id: string, @Body() dto: UpdatePropertyDto) {
    if (dto.media) {
      const propertyAssign = await this.propertiesService.findById(id);
      if(!propertyAssign){
        throw new NotFoundException('Propiedad no encontrada');
      }
      var folderId = '';
      if(!propertyAssign.folderId){
        dto.folderId = folderIdGenerator();
        folderId = dto.folderId;
      }else{
         folderId = propertyAssign.folderId;
      }
      dto.media = await this.processMedia(dto.media,String(propertyAssign.userId) + "/" + folderId);
    }
    return this.propertiesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN,Role.DESARROLLADORA,Role.AGENCIA,Role.AGENTE)
  remove(@Param('id') id: string) {
    return this.propertiesService.remove(id);
  }

  // private async processMedia(media: any, foldeertag: string) {
  //   if (!media) return media;

  //   if (!foldeertag) foldeertag= '';

  //   media.photos = media.photos
  // ? await Promise.all(
  //     media.photos.map(
  //       async (photo) => {

  //         const optimized =
  //           await this.fileManager.moveAndOptimizeFromTemp(
  //             String(photo.path),
  //             'properties/photos/' +
  //               foldeertag,
  //           );

  //         if (!optimized) {
  //           return null;
  //         }

  //         return {
  //           ...photo,
  //           path:
  //             optimized?.path || '',
  //           thumbnail:
  //             optimized?.thumbnail || '',
  //         };
  //       },
  //     ),
  //   )
  // : [];

  //   media.videos = media.videos?.map(video => ({
  //     ...video,
  //     path: this.fileManager.moveFromTemp(video.path, 'properties/videos/'+foldeertag),
  //   }));

  //   media.tour360 = media.tour360?.map(tour => ({
  //     ...tour,
  //     path: this.fileManager.moveFromTemp(tour.path, 'properties/tours/'+foldeertag),
  //   }));

  //   return media;
  // } 

  private async processMedia(
      media: any,
      foldeertag: string,
    ) {

      if (!media) {
        return media;
      }

      if (!foldeertag) {
        foldeertag = '';
      }

      // Procesar fotos únicamente si vienen en la petición
      if (media.photos) {

        media.photos = (
          await Promise.all(
            media.photos.map(
              async (photo) => {

                const optimized =
                  await this.fileManager.moveAndOptimizeFromTemp(
                    String(photo.path),
                    'properties/photos/' +
                      foldeertag,
                  );

                // Si la imagen ya estaba procesada
                if (!optimized) {
                  return photo;
                }

                return {
                  ...photo,
                  path: optimized.path,
                  thumbnail: optimized.thumbnail,
                };
              },
            ),
          )
        ).filter(Boolean);
      }

      // Procesar videos únicamente si vienen
      if (media.videos) {

        media.videos = media.videos.map(
          (video) => ({
            ...video,
            path: this.fileManager.moveFromTemp(
              String(video.path),
              'properties/videos/' +
                foldeertag,
            ),
          }),
        );
      }

      // Procesar tours únicamente si vienen
      if (media.tour360) {

        media.tour360 = media.tour360.map(
          (tour) => ({
            ...tour,
            path: this.fileManager.moveFromTemp(
              String(tour.path),
              'properties/tours/' +
                foldeertag,
            ),
          }),
        );
      }

      return media;
    }

  @Post(':id/visit')
  async incrementVisit(@Param('id') id: string) {
    await this.propertiesService.incrementVisits(id);
    return { success: true };
  }
  
  @Post(':id/click')
  async incrementClicks(@Param('id') id: string) {
    await this.propertiesService.incrementClicks(id);
    return { success: true };
  }
  
  @Get('metricas/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  getUserMetrics(@Param('id') id: string) {
    return this.propertiesService.getMetrics(id);
  }

  @Get('metricas-agente/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  getAgentMetrics(@Param('id') id: string) {
    return this.propertiesService.getAgentMetrics(id);
  }

  
  @Get('count/status-agents/:id')
  //@UseGuards(AuthGuard('jwt'), RolesGuard)
  countAgentsSatstus(@Param('id') id: string, @Req() req ){
    return this.propertiesService.getAgentPropertiesReport(id)
  }

  @Get('count/total/:id')
  countTotalProperties(@Param('id') id: string, @Req() req ){
    return this.propertiesService.getTotalProperties(id)
  }
  
}
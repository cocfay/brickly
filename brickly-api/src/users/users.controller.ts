import { Controller, Post, Get, Delete, Body, UseGuards, Put, Param, Req, UploadedFile, UseInterceptors, Query, NotFoundException, Headers, UnauthorizedException } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/roles.enum';
import { UpdateUserDto } from './dto/update-user.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Request } from 'express';
import { BadRequestException } from '@nestjs/common';

function editFileName(
  req: Request,
  file: Express.Multer.File,
  callback: (error: Error | null, filename: string) => void,
) {
  const uniqueSuffix =
    Date.now() + '-' + Math.round(Math.random() * 1e9);

  const ext = extname(file.originalname);
  const filename = `${uniqueSuffix}${ext}`;

  callback(null, filename);
}



@Controller('users')
export class UsersController {
  constructor(
		private usersService: UsersService
	) {}
  //#@UseGuards(AuthGuard('jwt'), RolesGuard)
  //#@Roles(Role.ADMIN)
  @Get('list-user')
  list(@Query() query: any) {
    return this.usersService.findAll(query);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('list-user-me')
  melist(@Req() req, @Query() query: any) {
    query.parentId = req.user.userId;
    return this.usersService.findAll(query);
  }

  @Get('profile/:slug')
  getUserByProfileSlug(@Param('slug') slug: string) {
    return this.usersService.findByProfileSlug(slug);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Get('verification/agencies')
  getAgenciesForVerification() {
    return this.usersService.findAgenciesForVerification();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Put('verification/agencies/:id')
  updateAgencyVerification(
    @Param('id') id: string,
    @Body() body: { verified: boolean },
  ) {
    if (typeof body?.verified !== 'boolean') {
      throw new BadRequestException('El estado de verificacion es requerido');
    }

    return this.usersService.updateAgencyVerification(id, body.verified);
  }

 

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@Req() req) {
    return this.usersService.findById(req.user.userId);
  }

  @Get('me/agent-limit')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.AGENCIA, Role.DESARROLLADORA)
  getAgentLimit(@Req() req) {
    return this.usersService.getAgentLimitInfo(req.user.userId);
  }

  @Put('me')
  @UseGuards(AuthGuard('jwt'))
  updateProfile(
    @Req() req,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateById(req.user.userId, dto);
  }

  @Put('me/avatar')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/profile',
        filename: editFileName,
      }),
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return cb(new BadRequestException('Solo imágenes'), false);
        }
        cb(null, true);
      },
    }),
  )
  uploadAvatar(
    @Req() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Debes enviar una imagen');
    }
    return this.usersService.updateById(req.user.userId, {
      avatar: `/uploads/profile/${file.filename}`,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('favorites')
  getFavorites(@Req() req) {
    return this.usersService.findById(req.user.userId)
      .then(user => user.populate('favorites'));
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  getUserById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN,Role.AGENCIA,Role.DESARROLLADORA)
  @Put(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req
  ) {
    const requesterRoles = req.user.roles || [];
    if (
      requesterRoles.includes(Role.AGENCIA) ||
      requesterRoles.includes(Role.DESARROLLADORA)
    ) {
      const UserEdit = await this.usersService.findById(id);
      if(UserEdit.parentId != req.user.userId){
        throw new NotFoundException('Propiedad no encontrada');
      }

    }
    return this.usersService.updateById(id, updateUserDto);
  }
  
  @UseGuards(AuthGuard('jwt'))
  @Post('favorites/:propertyId')
  toggleFavorite(@Req() req, @Param('propertyId') propertyId: string) {
    return this.usersService.toggleFavorite(req.user.userId, propertyId);
  }

  @Post(':id/click')
  async incrementClicks(@Param('id') id: string) {
    await this.usersService.incrementClicks(id);
    return { success: true };
  }

  @Post(':id/click-ws')
  async incrementClicksws(@Param('id') id: string) {
    await this.usersService.incrementClicksWs(id);
    return { success: true };
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN,Role.AGENCIA,Role.DESARROLLADORA)
  @Delete(':id')
  async deleteteUser(
    @Param('id') id: string,
    @Req() req
  ) {
    const requesterRoles = req.user.roles || [];
    if (
      requesterRoles.includes(Role.AGENCIA) ||
      requesterRoles.includes(Role.DESARROLLADORA)
    ) {
      const UserDelete = await this.usersService.findById(id);
      if(UserDelete.parentId != req.user.userId){
        throw new NotFoundException('Usuario no encontrado');
      }

    }
    return this.usersService.deleteUser(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Put('easybroker/apikey')
  async saveEasyBrokerApiKey(
    @Req() req,
    @Body()
    body: {
      apiKey: string;
    },
  ) {
      return this.usersService.saveEasyBrokerKey(
        req.user.userId,
        body.apiKey,
      );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Put(':id/assign-plan')
  async assignPlan(
    @Param('id') id: string,
    @Body() body: { plan: string; confirmCancel: boolean; customMaxProfiles?: number; expiresAt?: string },
  ) {
    return this.usersService.assignPlan(id, body);
  }

  @Post('expire-subscriptions')
  async expireSubscriptions(@Headers('x-cron-secret') cronSecret: string) {
    if (cronSecret !== (process.env.CRON_SECRET || 'Br1ckly-auth-code-cron')) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const count = await this.usersService.expireOverdueSubscriptions();
    return { processed: count, message: `${count} suscripciones vencidas bloqueadas.` };
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @Put('easybroker-adm/apikey')
  async saveEasyBrokerApiKeyaadm(
    @Req() req,
    @Body()
    body: {
      userId: string;
      apiKey: string;
    },
  ) {
      return this.usersService.saveEasyBrokerKey(
        body.userId,
        body.apiKey,
      );
  }


}

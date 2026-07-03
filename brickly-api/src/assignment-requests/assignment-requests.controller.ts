import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AssignmentRequestsService } from './assignment-requests.service';
import { CreateAssignmentRequestDto } from './dto/create-assignment-request.dto';
import { RejectAssignmentRequestDto } from './dto/reject-assignment-request.dto';

@Controller('assignment-requests')
export class AssignmentRequestsController {
  constructor(
    private readonly assignmentRequestsService: AssignmentRequestsService,
  ) {}

  @Get('eligibility/:propertyId')
  @UseGuards(AuthGuard('jwt'))
  checkEligibility(
    @Param('propertyId') propertyId: string,
    @Req() req,
  ) {
    return this.assignmentRequestsService.checkEligibility(
      propertyId,
      req.user.userId,
    );
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('agente')
  create(
    @Body() dto: CreateAssignmentRequestDto,
    @Req() req,
  ) {
    return this.assignmentRequestsService.create(
      dto.propertyId,
      req.user.userId,
    );
  }

  @Get('agency')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('agencia')
  findByAgency(@Req() req) {
    return this.assignmentRequestsService.findByAgency(req.user.userId);
  }

  @Put(':id/approve')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('agencia')
  approve(@Param('id') id: string, @Req() req) {
    return this.assignmentRequestsService.approve(id, req.user.userId);
  }

  @Put(':id/reject')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('agencia')
  reject(
    @Param('id') id: string,
    @Body() dto: RejectAssignmentRequestDto,
    @Req() req,
  ) {
    return this.assignmentRequestsService.reject(
      id,
      req.user.userId,
      dto.reason,
    );
  }
}

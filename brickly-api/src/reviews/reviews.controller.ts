import { Controller, Post, Body, Get, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  create(
    @Req() req,
    @Body() body: { agentId: string; rating: number; comment?: string },
  ) {
    return this.reviewsService.createReview(
      req.user.userId,
      body.agentId,
      body.rating,
      body.comment,
    );
  }

  @Post('update')
  @UseGuards(AuthGuard('jwt'))
  update(
    @Req() req,
    @Body() body: { agentId: string; rating: number; comment?: string },
  ) {
    return this.reviewsService.updateReview(
      req.user.userId,
      body.agentId,
      body.rating,
      body.comment,
    );
  }

  @Get('agent/:agentId')
  getByAgent(@Param('agentId') agentId: string) {
    return this.reviewsService.getAgentReviews(agentId);
  }

  @Delete(':agentId')
  @UseGuards(AuthGuard('jwt'))
  delete(@Req() req, @Param('agentId') agentId: string) {
    return this.reviewsService.deleteReview(req.user.userId, agentId);
  }
}
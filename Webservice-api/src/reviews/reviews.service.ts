import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review } from './schemas/review.schema';
import { User } from '../users/user.schema';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<Review>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async createReview(userId: string, agentId: string, rating: number, comment?: string) {

    if (userId === agentId) {
      throw new BadRequestException('No puedes calificarte a ti mismo');
    }

    // evitar duplicados
    const exists = await this.reviewModel.findOne({
      reviewerId: userId,
      agentId,
    });

    if (exists) {
      throw new BadRequestException('Ya calificaste a este agente');
    }

    const review = await this.reviewModel.create({
      reviewerId: userId,
      agentId,
      rating,
      comment,
    });

    await this.updateAgentRating(agentId);

    return review;
  }

  async updateReview(userId: string, agentId: string, rating: number, comment?: string) {

    if (userId === agentId) {
      throw new BadRequestException('No puedes calificarte a ti mismo');
    }

    // evitar duplicados
    const exists = await this.reviewModel.findOne({
      reviewerId: userId,
      agentId,
    });

    if (!exists) {
      throw new BadRequestException('No se encontro la review que intentas actualizar');
    }

    const review = await this.reviewModel.findOneAndUpdate({ 
        reviewerId: userId,
        agentId
      },
      {
        rating,
        comment,
      });

    await this.updateAgentRating(agentId);

    return review;
  }

  async getAgentReviews(agentId: string) {
    return this.reviewModel
      .find({ agentId })
      .populate('reviewerId', 'name')
      .sort({ createdAt: -1 });
  }

  async updateAgentRating(agentId: string) {

    const stats = await this.reviewModel.aggregate([
      {
        $match: { agentId: agentId }, // 👈 SIN ObjectId
      },
      {
        $group: {
          _id: '$agentId',
          avg: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
    ]);
    console.log("Stats Var",stats);

    const avg = stats[0]?.avg || 0;
    const count = stats[0]?.count || 0;

    await this.userModel.findByIdAndUpdate(agentId, {
      ratingAverage: avg,
      ratingCount: count,
    });
  }

  async deleteReview(userId: string, agentId: string) {
    const review = await this.reviewModel.findOneAndDelete({
      reviewerId: userId,
      agentId,
    });

    if (!review) {
      throw new NotFoundException('Review no encontrada');
    }

    await this.updateAgentRating(agentId);

    return { message: 'Review eliminada' };
  }
}
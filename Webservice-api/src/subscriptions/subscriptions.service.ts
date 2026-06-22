import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Subscription } from './schemas/subscription.schema';
import { Model } from 'mongoose';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectModel(Subscription.name)
    private model: Model<Subscription>,
  ) {}

  async createOrUpdate(data: Partial<Subscription>) {
    return this.model.findOneAndUpdate(
      { userId: data.userId },
      data,
      { upsert: true, new: true },
    );
  }

  async updateStatus(userId: string, status: string) {
    return this.model.updateOne({ userId }, { status });
  }

  async alreadyProcessed(recurrenteId: string) {
    const found = await this.model.findOne({ recurrenteId });
    return !!found;
  }
}
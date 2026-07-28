import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  ActivityLog,
  ActivityLogDocument,
} from './schemas/activity-log.schema';

import { CreateActivityLogDto } from './dto/create-activity-log.dto';

@Injectable()
export class ActivityLogsService {

  constructor(
    @InjectModel(ActivityLog.name)
    private readonly activityLogModel: Model<ActivityLogDocument>,
  ) {}

  async create(data: CreateActivityLogDto) {
    return this.activityLogModel.create(data);
  }

  async countByDateRange(params: {
    type: string;
    action: string;
    userIds?: Types.ObjectId[];
    createdFrom?: Date;
    createdTo?: Date;
  }): Promise<number> {
    const filter: any = {
      type: params.type,
      action: params.action,
    };

    if (params.userIds && params.userIds.length > 0) {
      filter.userId = { $in: params.userIds };
    }

    if (params.createdFrom || params.createdTo) {
      filter.createdAt = {};
      if (params.createdFrom) filter.createdAt.$gte = params.createdFrom;
      if (params.createdTo) filter.createdAt.$lte = params.createdTo;
    }

    return this.activityLogModel.countDocuments(filter);
  }
}
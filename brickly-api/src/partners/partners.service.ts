import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Partner } from './schemas/partner.schema';
import { User } from '../users/user.schema';
import { Types } from 'mongoose';

@Injectable()
export class PartnersService {
  constructor(
    @InjectModel(Partner.name)
    private partnerModel: Model<Partner>,
    @InjectModel(User.name)
        private userModel: Model<User>,
  ) {}

  async create(data: any) {
    return this.partnerModel.create(data);
  }

  async update(id: string, data: any) {
    const partner = await this.partnerModel.findByIdAndUpdate(
      id,
      data,
      { new: true },
    );

    if (!partner) {
      throw new NotFoundException('Asociado no encontrado');
    }

    return partner;
  }

  async remove(id: string) {
    const partner = await this.partnerModel.findByIdAndDelete(id);

    if (!partner) {
      throw new NotFoundException('Asociado no encontrado');
    }

    return {
      message: 'Asociado eliminado correctamente',
    };
  }

  async findOne(id: string) {
    const partner = await this.partnerModel.findById(id);

    if (!partner) {
      throw new NotFoundException('Asociado no encontrado');
    }

    return partner;
  }

  async findAll(query: any) {
    const filters: any = {};

    if (query.category) {
      filters.category = query.category;
    }

    if (query.type) {
      filters.type = query.type;
    }

    // opcional:
    // solo asociados activos
    if (query.active === 'true') {
      filters.expire_date = {
        $gte: new Date(),
      };
    }

    return this.partnerModel
      .find(filters)
      .sort({ createdAt: -1 });
  }

  async getNextExpiring(limit = 10) {
  const nextExpires = await this.partnerModel
    .find({
      expire_date: {
        $gt: new Date(),
      },
    })
    .sort({
      expire_date: 1,
    })
    .limit(limit);

  return Promise.all(
    nextExpires.map(async (dtc) => {
      let ratingAverage = 0;
      let ratingCount = 0;

      if (
        dtc.type &&
        Types.ObjectId.isValid(dtc.type)
      ) {
        const modelUser =
          await this.userModel.findById(dtc.type);

        if (modelUser) {
          ratingAverage =
            modelUser.ratingAverage || 0;

          ratingCount =
            modelUser.ratingCount || 0;
        }
      }

      return {
        ...dtc.toObject(),
        ratingAverage,
        ratingCount,
      };
    }),
  );
}
}
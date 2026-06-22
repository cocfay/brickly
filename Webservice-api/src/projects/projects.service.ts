// projects.service.ts
import { Injectable, NotFoundException  } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project, ProjectDocument } from './schemas/project.schema';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name)
    private projectModel: Model<ProjectDocument>,
  ) {}

  async create(userId: string, dto: CreateProjectDto) {
    const project = new this.projectModel({
      ...dto,
      userId,
    });

    return project.save();
  }

  async findAll() {
    return this.projectModel.find().sort({ createdAt: -1 });
  }

  async findByUser(userId: string) {
    return this.projectModel.find({ userId });
  }

  async findOne(id: string) {
    return this.projectModel.findById(id);
  }

  async delete(id: string, userId: string) {
    return this.projectModel.findOneAndDelete({
      _id: id,
      userId,
    });
  }
  async update(id: string, data: any) {
    const project = await this.projectModel.findByIdAndUpdate(
      id,
      {
        $set: data,
      },
      {
        new: true,
      },
    );

    if (!project) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    return project;
  }
}
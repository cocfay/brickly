// projects.service.ts
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project, ProjectDocument } from './schemas/project.schema';
import {
  ProjectLead,
  ProjectLeadDocument,
} from './schemas/project-lead.schema';
import {
  ProjectCitaClick,
  ProjectCitaClickDocument,
} from './schemas/project-cita-click.schema';
import { CreateProjectDto } from './dto/create-project.dto';
import { ContactService } from '../contact/contact.service';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name)
    private projectModel: Model<ProjectDocument>,
    @InjectModel(ProjectLead.name)
    private projectLeadModel: Model<ProjectLeadDocument>,
    @InjectModel(ProjectCitaClick.name)
    private projectCitaClickModel: Model<ProjectCitaClickDocument>,
    private contactService: ContactService,
  ) {}

  async create(userId: string, dto: CreateProjectDto) {
    const models = this.assignModelSlugs(dto.models);
    const project = new this.projectModel({
      ...dto,
      models,
      userId,
    });

    project.projectSlug = await this.ensureUniqueProjectSlug(
      dto.projectSlug || this.getProjectSlugSource(project),
    );

    return project.save();
  }

  async findAll(query: any = {}) {
    const filters: any = {};

    if (query?.status && query.status !== 'all') {
      filters.status = query.status;
    }

    return this.projectModel.find(filters).sort({ createdAt: -1 });
  }

  async findByUser(userId: string) {
    return this.projectModel.find({ userId });
  }

  async findOne(id: string) {
    let project = await this.projectModel.findOne({
      projectSlug: this.normalizeProjectSlug(id),
    });

    if (!project && this.isObjectId(id)) {
      project = await this.projectModel.findById(id);
    }

    if (!project) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    return project;
  }

  async delete(id: string, user?: any) {
    const isAdmin = user?.roles?.includes('admin');

    const project = isAdmin
      ? await this.projectModel.findOneAndDelete({ _id: id })
      : await this.projectModel.findOneAndDelete({
          _id: id,
          userId: user?.userId,
        });

    if (!project) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    return project;
  }

  async update(id: string, data: any) {
    const currentProject = await this.projectModel.findById(id);
    if (!currentProject) {
      throw new NotFoundException('Proyecto no encontrado');
    }

    const updateData: any = { ...data };

    if (Array.isArray(data.models)) {
      updateData.models = this.assignModelSlugs(data.models);
    }

    const incomingTitle = data.title;
    const currentTitle = currentProject.title;
    if (data.projectSlug) {
      updateData.projectSlug = await this.ensureUniqueProjectSlug(
        data.projectSlug,
        id,
      );
    } else if (incomingTitle && incomingTitle !== currentTitle) {
      updateData.projectSlug = await this.ensureUniqueProjectSlug(
        incomingTitle,
        id,
      );
    } else if (!currentProject.projectSlug) {
      updateData.projectSlug = await this.ensureUniqueProjectSlug(
        this.getProjectSlugSource(currentProject),
        id,
      );
    }

    const project = await this.projectModel.findByIdAndUpdate(
      id,
      {
        $set: updateData,
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

  // ─── Leads de proyectos ("Solicitar información") ─────────────────────────

  async createLead(dto: any) {
    const { projectId, ...rest } = dto;
    const ref = await this.resolveProjectRef(dto.projectSlug, projectId);
    const lead = new this.projectLeadModel({ ...rest, ...ref });
    const saved = await lead.save();

    const project = ref.projectId
      ? await this.projectModel
          .findById(ref.projectId)
          .select('title')
          .lean()
      : null;

    await this.contactService
      .sendProjectLeadEmails({
        email: dto.email,
        name: dto.name,
        lastname: dto.lastname,
        phone: dto.phone,
        message: dto.message,
        projectTitle: project?.title || dto.projectSlug,
        modelName: dto.modelName,
        type: dto.type,
      })
      .catch(() => {});

    return saved;
  }

  async findLeads(query: any = {}) {
    const filters: any = {};

    if (query?.projectSlug) filters.projectSlug = query.projectSlug;
    if (query?.type) filters.type = query.type;
    if (query?.status) filters.status = query.status;
    if (query?.dateFrom || query?.dateTo) {
      filters.createdAt = {};
      if (query?.dateFrom) filters.createdAt.$gte = new Date(query.dateFrom);
      if (query?.dateTo) filters.createdAt.$lte = new Date(query.dateTo);
    }

    const limit = Number(query?.limit) || 200;
    return this.projectLeadModel
      .find(filters)
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  async updateLeadStatus(ids: string[], status = 'revisado') {
    await this.projectLeadModel.updateMany(
      { _id: { $in: ids } },
      { $set: { status } },
    );
    return { success: true, updated: ids.length };
  }

  // ─── Clics "agendar cita" ─────────────────────────────────────────────────

  async createCitaClick(dto: any) {
    const { projectId, ...rest } = dto;
    const ref = await this.resolveProjectRef(dto.projectSlug, projectId);
    const click = new this.projectCitaClickModel({ ...rest, ...ref });
    return click.save();
  }

  async findCitaClicks(query: any = {}) {
    const filters: any = {};

    if (query?.projectSlug) filters.projectSlug = query.projectSlug;
    if (query?.modelSlug) filters.modelSlug = query.modelSlug;
    if (query?.dateFrom || query?.dateTo) {
      filters.clickedAt = {};
      if (query?.dateFrom) filters.clickedAt.$gte = new Date(query.dateFrom);
      if (query?.dateTo) filters.clickedAt.$lte = new Date(query.dateTo);
    }

    const limit = Number(query?.limit) || 500;
    return this.projectCitaClickModel
      .find(filters)
      .sort({ clickedAt: -1 })
      .limit(limit);
  }

  async getCitaClicksDaily(query: any = {}) {
    const filters: any = {};

    if (query?.projectSlug) filters.projectSlug = query.projectSlug;
    if (query?.modelSlug) filters.modelSlug = query.modelSlug;
    if (query?.dateFrom || query?.dateTo) {
      filters.clickedAt = {};
      if (query?.dateFrom) filters.clickedAt.$gte = new Date(query.dateFrom);
      if (query?.dateTo) filters.clickedAt.$lte = new Date(query.dateTo);
    }

    const agg = await this.projectCitaClickModel.aggregate([
      { $match: filters },
      {
        $group: {
          _id: {
            year: { $year: '$clickedAt' },
            month: { $month: '$clickedAt' },
            day: { $dayOfMonth: '$clickedAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    return agg.map((item) => ({
      date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(
        item._id.day,
      ).padStart(2, '0')}`,
      count: item.count,
    }));
  }

  private async resolveProjectRef(projectSlug?: string, projectId?: string) {
    if (projectId) return { projectId };
    if (projectSlug && this.isObjectId(projectSlug)) {
      return { projectId: projectSlug };
    }
    if (projectSlug) {
      const project = await this.projectModel
        .findOne({ projectSlug })
        .select('_id')
        .lean();
      return project ? { projectId: project._id } : {};
    }
    return {};
  }

  // ─── Slug helpers ──────────────────────────────────────────────────────────

  private getProjectSlugSource(project: any) {
    return project?.title || project?.address || 'proyecto';
  }

  private normalizeProjectSlug(value: string) {
    const base = String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-')
      .slice(0, 100)
      .replace(/-+$/g, '');

    const slug = base || 'proyecto';
    return this.reservedProjectSlugs.has(slug) ? `${slug}-proyecto` : slug;
  }

  private reservedProjectSlugs = new Set([
    'add',
    'edit',
    'view',
    'favoritos',
    'proyecto',
    'proyectos',
    'api',
  ]);

  private isObjectId(value: string) {
    return /^[a-f\d]{24}$/i.test(value);
  }

  private async ensureUniqueProjectSlug(value: string, projectId?: string) {
    const baseSlug = this.normalizeProjectSlug(value);
    let candidate = baseSlug;
    let suffix = 2;

    while (
      await this.projectModel.exists({
        projectSlug: candidate,
        ...(projectId ? { _id: { $ne: projectId } } : {}),
      })
    ) {
      candidate = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  // ─── Model slug helpers ────────────────────────────────────────────────

  /**
   * Asigna modelSlug a cada modelo que no lo tenga, garantizando unicidad
   * dentro del arreglo de modelos del proyecto.
   */
  private assignModelSlugs(models?: any[]) {
    const list = models || [];
    return list.map((m, index) => {
      const source = m?.modelSlug || m?.nombre || `modelo-${index + 1}`;
      const modelSlug = this.ensureUniqueModelSlug(list, source, index);
      return { ...(m || {}), modelSlug };
    });
  }

  private normalizeModelSlug(value: string) {
    const base = String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-')
      .slice(0, 100)
      .replace(/-+$/g, '');

    return base || 'modelo';
  }

  private ensureUniqueModelSlug(
    models: any[],
    value: string,
    excludeIndex = -1,
  ) {
    const baseSlug = this.normalizeModelSlug(value);
    let candidate = baseSlug;
    let suffix = 2;
    const taken = new Set<string>();

    (models || []).forEach((m, i) => {
      if (i !== excludeIndex && m?.modelSlug) {
        taken.add(m.modelSlug);
      }
    });

    while (taken.has(candidate)) {
      candidate = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }
}

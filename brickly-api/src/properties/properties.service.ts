import { Injectable, NotFoundException, ForbiddenException  } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Property } from './schemas/property.schema';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { Types } from 'mongoose';
import { User } from '../users/user.schema';
import { Role } from '../auth/roles.enum';
import { ContactService } from '../contact/contact.service';
import { ActivityLogsService } from '../activitylogs/activitylogs.service';


@Injectable()
export class PropertiesService {
  constructor(
    private ContactService: ContactService,
    @InjectModel(Property.name)
    private propertyModel: Model<Property>,
    @InjectModel(User.name)
    private userModel: Model<User>,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  async create(dto: CreatePropertyDto) {
    const createData:any = {...dto};
    if(dto.userId){
      createData.userId = new Types.ObjectId(dto.userId);
    }
    createData.propertySlug = await this.ensureUniquePropertySlug(
      createData.propertySlug || this.getPropertySlugSource(createData),
    );

    return this.propertyModel.create(createData);
  }

  // findAll(query: any) {
  //   return this.propertyModel.find(query).sort({ createdAt: -1 });
  // }
  async findAll(query: any) {
        const page =
          Number(query.page) || 1;

        const limit = Math.min(
          Number(query.limit) || 10,
          100,
        );

        const skip = (page - 1) * limit;

        const filters = { ...query };
        var orderByReg = {};
        
        if(filters.orderby){
          const hasCustomOrder = filters.orderby || filters['orderby[]'];
          const orderbyArray = Array.isArray(hasCustomOrder) ? hasCustomOrder : [hasCustomOrder];
            orderbyArray.forEach((e, i) => {
              var [attrEntry, orderEntry] = e.split(':');
              if(!orderEntry){
                orderEntry = -1;
              }else if(orderEntry.toLowerCase() == "asc"){
                orderEntry = 1;
              }else if( orderEntry.toLowerCase() == "desc"){
                orderEntry = -1;
              }else{
                orderEntry = -1;
              }
              orderByReg[attrEntry] = orderEntry;
            });

        }else{
          orderByReg = {
                  'featured.isActive': -1,
                  updatedAt: -1,
                };
        }

        if(filters.agents || filters['agents[]']){

           const rawAgents = filters.agents || filters['agents[]'];
           const agentsArray = Array.isArray(rawAgents) ? rawAgents : [rawAgents];
           filters.agents = { $in: agentsArray };
           

           delete filters['agents[]'];
        }

        if(filters.userId){
          const mainUserIdObj = new Types.ObjectId(filters.userId);
          const subUsersRaw = await this.userModel.find(
            { parentId: mainUserIdObj },
            { _id: 1 }
          ).lean();
          const subUserIdsObj = subUsersRaw.map(user => user._id);
          const allowedUserIds = [mainUserIdObj, ...subUserIdsObj];
          filters.userId = { $in: allowedUserIds };
        }

        if (filters.search && filters.search.toString().trim() !== '') {
          const searchString = filters.search.toString().trim();

          filters.$text = { $search: searchString };
          const hasCustomOrder = filters.orderby || filters['orderby[]'];
          if (!hasCustomOrder) {
            orderByReg = { 'featured.isActive': -1, score: { $meta: 'textScore' } };
          }
        }

        delete filters.page;
        delete filters.limit;
        delete filters.orderby;
        delete filters.search;
        
        if (query.bedsMin !== undefined) {
          filters['layout.bedrooms'] = { $gte: Number(query.bedsMin) };
          delete filters.bedsMin;
        }

        if (query.bathsMin !== undefined) {
          filters['layout.bathrooms'] = { $gte: Number(query.bathsMin) };
          delete filters.bathsMin;
        }

        if (query.priceMin !== undefined || query.priceMax !== undefined) {
          filters['market.price'] = {};
          if (query.priceMin !== undefined) filters['market.price'].$gte = Number(query.priceMin);
          if (query.priceMax !== undefined) filters['market.price'].$lte = Number(query.priceMax);
          delete filters.priceMin;
          delete filters.priceMax;
        }

        if (query.priceUSDMin !== undefined || query.priceUSDMax !== undefined) {
          filters['market.priceUSD'] = {};
          if (query.priceUSDMin !== undefined) filters['market.priceUSD'].$gte = Number(query.priceUSDMin);
          if (query.priceUSDMax !== undefined) filters['market.priceUSD'].$lte = Number(query.priceUSDMax);
          delete filters.priceUSDMin;
          delete filters.priceUSDMax;
        }

        if (
            filters['market.price'] &&
              Object.keys(filters['market.price'])
                .length === 0
            ) {
              delete filters['market.price'];
            }
            
        if (
          filters['market.priceUSD'] &&
            Object.keys(filters['market.priceUSD'])
              .length === 0
          ) {
            delete filters['market.priceUSD'];
          }
        /** 
        const total =
          await this.propertyModel.countDocuments(
            filters,
          );

        const data =
          await this.propertyModel
            .find(filters, filters.$text ? { score: { $meta: 'textScore' } } : {})
            .sort(orderByReg)
            .skip(skip)
            .limit(limit)
            .lean(); */

        const [total, data] = await Promise.all([
              this.propertyModel.countDocuments(filters),
              this.propertyModel
                .find(filters, filters.$text ? { score: { $meta: 'textScore' } } : {})
                .sort(orderByReg)
                .skip(skip)
                .limit(limit)
                .lean()
            ]);

        const properties = await this.ensurePropertySlugsForProperties(data);

        return {
          total,
          page,
          limit,
          totalPages: Math.ceil(
            total / limit,
          ),
          data: properties,
        };
      }

  async findById(id: string) {
    let property = await this.propertyModel.findOne({
      propertySlug: this.normalizePropertySlug(id),
    });

    if (!property && this.isObjectId(id)) {
      property = await this.propertyModel.findById(id);
    }

    if (!property) throw new NotFoundException('Property not found');
    return this.ensurePropertySlugForProperty(property);
  }

  async update(id: string, dto: UpdatePropertyDto) {
    const currentProperty = await this.propertyModel.findById(id);
    if (!currentProperty) throw new NotFoundException('Property not found');

    const updateData:any = {...dto};
    if(dto.userId){
      updateData.userId = new Types.ObjectId(dto.userId);
    }

    const incomingTitle = dto.market?.title;
    const currentTitle = currentProperty.market?.title;
    if (dto.propertySlug) {
      updateData.propertySlug = await this.ensureUniquePropertySlug(
        dto.propertySlug,
        id,
      );
    } else if (incomingTitle && incomingTitle !== currentTitle) {
      updateData.propertySlug = await this.ensureUniquePropertySlug(
        incomingTitle,
        id,
      );
    } else if (!currentProperty.propertySlug) {
      updateData.propertySlug = await this.ensureUniquePropertySlug(
        this.getPropertySlugSource(currentProperty),
        id,
      );
    }

    const property = await this.propertyModel.findByIdAndUpdate(id,{ $set: updateData }, {
      new: true,
    });
    if (!property) throw new NotFoundException('Property not found');

    if(property.status === "pre-published"){
      let ntfyTitle = "Propiedad pendiente de aprobación";
      let ntfyMessage = `${property.market.title.slice(0,20)}... necesita tu aprobación  https://www.bricklyhomes.com/cpanel/propiedades/view/${property._id}`;
      await this.ContactService.ntfySend({tag:"br-propiedad", title:ntfyTitle, message:ntfyMessage})
    }
    return property;
  }

  async remove(id: string) {
    const property = await this.propertyModel.findByIdAndDelete(id);
    if (!property) throw new NotFoundException('Property not found');
    return { message: 'Property deleted' };
  }

  async incrementVisits(propertyId: string) {
    const property = await this.findById(propertyId);

    await this.activityLogsService.create({
      type: 'property',
      userId: property._id.toString(),
      action: 'visit',
    });
    
    return this.propertyModel.findByIdAndUpdate(
      property._id,
      { $inc: { visitCounter: 1 } },
      { new: true }
    );
  }
  async incrementClicks(propertyId: string) {
    const property = await this.findById(propertyId);

    await this.activityLogsService.create({
      type: 'property',
      userId: property._id.toString(),
      action: 'click',
    });
    return this.propertyModel.findByIdAndUpdate(
      property._id,
      { $inc: { clickCounter: 1 } },
      { new: true }
    );
  }

  async trackPropertyView(userId: string, propertyId: string) {
    const property = await this.propertyModel.findById(propertyId);
    if (!property) throw new NotFoundException('Property not found');

    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    if (!Array.isArray(user.roles) || !user.roles.includes(Role.CLIENTE)) {
      return { tracked: false, reason: 'usuario no es cliente' };
    }

    const lastNewsletterPropertyId = user.lastNewsletterProperty
      ? user.lastNewsletterProperty.toString()
      : null;

    const newsletterRecommendationSent =
      lastNewsletterPropertyId === propertyId
        ? user.newsletterRecommendationSent ?? false
        : false;

    await this.userModel.findByIdAndUpdate(
      userId,
      {
        $set: {
          lastViewedProperty: new Types.ObjectId(propertyId),
          lastViewedAt: new Date(),
          newsletterRecommendationSent,
        },
      },
      { new: true },
    );

    return { tracked: true, newsletterRecommendationSent };
  }

  async sendRecommendationNewsletters() {
    const pendingUsers = await this.userModel.find({
      roles: 'cliente' as any,
      isEnabled: { $ne: false },
      lastViewedProperty: { $exists: true, $ne: null },
      newsletterRecommendationSent: false,
    } as any);

    let enviados = 0;
    let errores = 0;
    const erroresDetalle: string[] = [];
    const enviadosDetalle: { email: string; messageId?: string; status?: number }[] = [];

    for (const user of pendingUsers) {
      try {
        const viewed = await this.propertyModel.findById(user.lastViewedProperty);

        if (!viewed || viewed.status !== 'published') {
          await this.userModel.findByIdAndUpdate(user._id, {
            $set: {
              newsletterRecommendationSent: true,
              newsletterRecommendationSentAt: new Date(),
              lastNewsletterProperty: user.lastViewedProperty,
            },
          });
          continue;
        }

        const zone = viewed.location?.zone as string | undefined;

        let recommended: any[] = [];
        if (zone) {
          recommended = await this.propertyModel
            .find({
              _id: { $ne: viewed._id },
              status: 'published',
              'location.zone': zone,
            })
            .limit(4)
            .lean();
        }

        if (recommended.length < 4) {
          const excludeIds = [
            viewed._id,
            ...recommended.map((r) => r._id),
          ];
          const missing = 4 - recommended.length;
          const extra = await this.propertyModel
            .find({
              _id: { $nin: excludeIds },
              status: 'published',
            })
            .limit(missing)
            .lean();
          recommended = [...recommended, ...extra];
        }

        const html = this.recommendationNewsletterHtml({
          user,
          viewed,
          recommended,
          zone,
        });

        const sent = await this.ContactService.sendEmail({
          emailTo: user.email,
          name: user.name,
          subject: `Viste una propiedad en ${zone || 'tu zona'}, te recomendamos estas opciones`,
          html,
        });

        if (!sent.ok) {
          throw new Error('El envío del correo no fue confirmado');
        }

        enviadosDetalle.push({
          email: user.email,
          messageId: sent.messageId,
          status: sent.status,
        });

        await this.userModel.findByIdAndUpdate(user._id, {
          $set: {
            newsletterRecommendationSent: true,
            newsletterRecommendationSentAt: new Date(),
            lastNewsletterProperty: viewed._id,
          },
        });

        enviados++;
      } catch (error: any) {
        errores++;
        erroresDetalle.push(`${user.email}: ${error?.message || error}`);
      }
    }

    return {
      total: pendingUsers.length,
      enviados,
      errores,
      erroresDetalle,
      enviadosDetalle,
    };
  }

  async debugRecommendationNewsletters() {
    const pendingFilter = {
      roles: 'cliente',
      isEnabled: { $ne: false },
      lastViewedProperty: { $exists: true, $ne: null },
      newsletterRecommendationSent: false,
    };

    const users = await this.userModel
      .find(
        { roles: 'cliente' as any },
        {
          email: 1,
          name: 1,
          isEnabled: 1,
          roles: 1,
          lastViewedProperty: 1,
          lastViewedAt: 1,
          lastNewsletterProperty: 1,
          newsletterRecommendationSent: 1,
          newsletterRecommendationSentAt: 1,
        },
      )
      .lean();

    return {
      filtroPendientes: pendingFilter,
      totalClientes: users.length,
      usuarios: users.map((u) => ({
        ...u,
        coincidiriaEnvio: !(
          u.isEnabled === false ||
          !u.lastViewedProperty ||
          u.newsletterRecommendationSent === true
        ),
      })),
    };
  }

  private absoluteAsset(path?: string) {
    if (!path) return '';
    if (/^https?:\/\//.test(path)) return path;
    return `https://ws-identity.bricklyhomes.com/${path.replace(/^\/+/, '')}`;
  }

  private propertyLink(property: any) {
    return `https://www.bricklyhomes.com/propiedades/${property.propertySlug || property._id}`;
  }

  private propertyPrice(property: any) {
    const market = property.market || {};
    if (market.priceUSD) return `$${Number(market.priceUSD).toLocaleString('en-US')}`;
    if (market.price) return `Q${Number(market.price).toLocaleString('en-US')}`;
    return 'Consultar precio';
  }

  private static readonly REC_ICONS = {
    bed: 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzExMSI+PHBhdGggZD0iTTMgMTh2LTVhMiAyIDAgMCAxIDItMmgxNGEyIDIgMCAwIDEgMiAydjVoLTJ2LTJINXYySDN6bTItOHYxaDE0di0xSDV6Ii8+PGNpcmNsZSBjeD0iNyIgY3k9IjEyIiByPSIxLjYiLz48L3N2Zz4=',
    bath: 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzExMSI+PHBhdGggZD0iTTQgMTJoMTZ2MWE0IDQgMCAwIDEtNCA0SDhhNCA0IDAgMCAxLTQtNHYtMXptMSAxYTMgMyAwIDAgMCAzIDNoOGEzIDMgMCAwIDAgMy0zSDV6Ii8+PHBhdGggZD0iTTYgNmEyIDIgMCAwIDEgMi0yYy40IDAgLjguMSAxLjEuM0w4IDZhMSAxIDAgMCAwLS45LS45eiIvPjwvc3ZnPg==',
    car: 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzExMSI+PHBhdGggZD0iTTUgMTFsMS41LTQuNkEyIDIgMCAwIDEgOC40IDVoNy4yYTIgMiAwIDAgMSAxLjkgMS40TDE5IDExYTIgMiAwIDAgMSAyIDJ2NGgtMmEyIDIgMCAxIDEtNCAwSDlhMiAyIDAgMSAxLTQgMEgzdi00YTIgMiAwIDAgMSAyLTJ6bTItMWgxMGwtLjctMi4yYS42LjYgMCAwIDAtLjYtLjRIOC4zYS42LjYgMCAwIDAtLjYuNEw3IDEweiIvPjwvc3ZnPg==',
    pin: 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMTExIiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIGQ9Ik0xMiAyMXMtNy02LjEtNy0xMWE3IDcgMCAxIDEgMTQgMGMwIDQuOS03IDExLTcgMTF6Ii8+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMCIgcj0iMi41IiBmaWxsPSIjMTExIi8+PC9zdmc+',
    home: 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMTExIiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIGQ9Ik0zIDEwLjUgMTIgM2w5IDcuNVYyMGExIDEgMCAwIDEtMSAxaC01di02aC02djZINGExIDEgMCAwIDEtMS0xdi05LjV6Ii8+PC9zdmc+',
    expand: 'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMTExIiBzdHJva2Utd2lkdGg9IjIuNCI+PHBhdGggZD0iTTcgMTcgMTcgN005IDdoOHY4Ii8+PC9zdmc+',
  };

  private recommendationIcon(b64: string, size = 14) {
    return `<img src="data:image/svg+xml;base64,${b64}" alt="" width="${size}" height="${size}" style="width:${size}px; height:${size}px; vertical-align:-2px; display:inline-block; border:0;">`;
  }

  private recommendationDescriptionBlock(p: any, titleSize = '20px', truncate = false) {
    const icon = this.recommendationIcon;
    const title = p.market?.title || 'Propiedad';
    const link = this.propertyLink(p);
    const loc = p.location || {};
    const layout = p.layout || {};
    const dim = p.dimensions || {};

    const truncateStyle = truncate ? ' white-space:nowrap; overflow:hidden; text-overflow:ellipsis;' : '';

    const locParts: string[] = [];
    if (loc.department && String(loc.department).toLowerCase() !== 'ninguno') locParts.push(loc.department);
    if (loc.municipality && String(loc.municipality).toLowerCase() !== 'ninguno') locParts.push(loc.municipality);
    if (loc.zone && String(loc.zone).toLowerCase() !== 'ninguno') locParts.push(`Zona ${loc.zone}`);
    const locationText = locParts.join(', ');

    const bedrooms = layout.bedrooms || 0;
    const bathrooms = (layout.bathrooms || 0) + (layout.halfBathrooms || 0);
    const parking = layout.parkingSpots || 0;
    const landM2 = dim.landM2 || 0;
    const landV2 = dim.landV2 || 0;

    const specs: string[] = [];
    if (bedrooms > 0) specs.push(`<span style="display:inline-block; margin-right:12px;">${icon(PropertiesService.REC_ICONS.bed)}<span style="vertical-align:2px; margin-left:5px; color:#333333;">${bedrooms}</span></span>`);
    if (bathrooms > 0) specs.push(`<span style="display:inline-block; margin-right:12px;">${icon(PropertiesService.REC_ICONS.bath)}<span style="vertical-align:2px; margin-left:5px; color:#333333;">${bathrooms}</span></span>`);
    if (parking > 0) specs.push(`<span style="display:inline-block; margin-right:12px;">${icon(PropertiesService.REC_ICONS.car)}<span style="vertical-align:2px; margin-left:5px; color:#333333;">${parking}</span></span>`);
    if (landM2 > 0) specs.push(`<span style="display:inline-block;">${icon(PropertiesService.REC_ICONS.car)}<span style="vertical-align:2px; margin-left:5px; color:#333333;">${landM2}m²</span></span>`);
    else if (landV2 > 0) specs.push(`<span style="display:inline-block;">${icon(PropertiesService.REC_ICONS.car)}<span style="vertical-align:2px; margin-left:5px; color:#333333;">${landV2}v²</span></span>`);
    const specsHtml = specs.length ? `<div style="margin:9px 0 0 0; font-size:13px; line-height:18px; color:#333333;">${specs.join('')}</div>` : '';

    const modeBadge = p.market?.mode
      ? p.market.mode === 'Venta'
        ? `<span style="display:inline-block; background-color:#111111; color:#ffffff; font-size:12px; font-weight:600; padding:3px 14px; border-radius:4px; line-height:16px;">Venta</span>`
        : p.market.mode === 'Alquiler'
          ? `<span style="display:inline-block; background-color:#B65740; color:#ffffff; font-size:12px; font-weight:600; padding:3px 14px; border-radius:4px; line-height:16px;">Alquiler</span>`
          : ''
      : '';

    return `
                <a href="${link}" target="_blank" style="text-decoration:none;">
                  <p style="margin:0; font-family:'Apple Garamond',Georgia,serif; font-size:${titleSize}; line-height:28px; font-weight:700; color:#111111;${truncateStyle}">${title}</p>
                </a>
                ${locationText ? `<p style="margin:6px 0 0 0; font-size:13px; line-height:18px; color:#555555;">${icon(PropertiesService.REC_ICONS.pin, 13)}<span style="vertical-align:1px; margin-left:4px;">${locationText}</span></p>` : ''}
                ${p.market?.type ? `<p style="margin:4px 0 0 0; font-size:13px; line-height:18px; color:#555555;">Tipo: ${p.market.type}</p>` : ''}
                ${specsHtml}
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top:10px;">
                  <tr>
                    <td align="left" style="font-size:16px; font-weight:700; color:#111111; line-height:22px;">${this.propertyPrice(p)}</td>
                    <td align="right">
                      ${p.market?.mode ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="display:inline-block;"><tr><td>${modeBadge}</td></tr></table>` : ''}
                    </td>
                  </tr>
                </table>
              `;
  }

  private recommendationCardHtml(p: any) {
    const photo = this.absoluteAsset(
      p.media?.photos?.find((pp: any) => pp.isMain)?.path ||
        p.media?.photos?.[0]?.path,
    );
    const title = p.market?.title || 'Propiedad';
    const link = this.propertyLink(p);

    const featuredHtml = p.featured?.isActive
      ? `<div style="position:absolute; top:10px; left:10px; background-color:#000000c7; color:#ffffff; font-size:12px; font-weight:600; padding:4px 12px; border-radius:20px; line-height:16px;"><span style="color:#FFC94D; margin-right:6px;">&#9670;</span>Destacada</div>`
      : '';

    return `
            <div class="col-50" style="display:inline-block; width:100%; max-width:252px; vertical-align:top; font-size:0; text-align:left; margin-right:22px; margin-bottom:34px;">
              <div style="position:relative; border-radius:16px; overflow:hidden; font-size:14px;">
                <a href="${link}" target="_blank">
                  <img src="${photo}" alt="${title}" width="270" style="width:100%; display:block; border:0; border-radius:16px; aspect-ratio:1/1; object-fit:cover;">
                </a>
                ${featuredHtml}
                <div style="position:absolute; right:10px; bottom:10px; width:28px; height:28px; background-color:#ffffff; border-radius:50%; text-align:center; line-height:28px;">${this.recommendationIcon(PropertiesService.REC_ICONS.expand, 14)}</div>
              </div>
              <div style="padding-top:12px; font-size:14px;">
                ${this.recommendationDescriptionBlock(p, '20px', true)}
              </div>
            </div>
          `;
  }

  private recommendationNewsletterHtml(data: {
    user: any;
    viewed: any;
    recommended: any[];
    zone?: string;
  }) {
    const { user, viewed, recommended, zone } = data;

    const viewedPhoto = this.absoluteAsset(
      viewed.media?.photos?.find((p: any) => p.isMain)?.path ||
        viewed.media?.photos?.[0]?.path,
    );
    const viewedTitle = viewed.market?.title || 'Propiedad';
    const viewedLink = this.propertyLink(viewed);

    const cards = recommended
      .map((p) => this.recommendationCardHtml(p))
      .join('');

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Te recomendamos propiedades - Brickly Homes</title>
          <style>
              @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;700&display=swap');

              @media screen and (max-width: 600px) {
                  .wrapper { width: 100% !important; max-width: 100% !important; }
                  .col-50 { width: 100% !important; max-width: 100% !important; display: block !important; margin-right: 0 !important; }
                  .col-33 { width: 100% !important; max-width: 100% !important; display: block !important; margin-bottom: 30px !important; }
                  .hide-mobile { display: none !important; }
                  .padding-mobile { padding: 25px 20px !important; }
                  .text-center-mobile { text-align: center !important; }
                  .img-full { width: 100% !important; height: auto !important; }
                  .no-border-mobile { border: none !important; }
              }
              @media (prefers-color-scheme: dark) {
                  .logo-dark { display: none !important; }
                  .logo-light { display: block !important; }
              }
              [data-ogsc] .logo-dark { display: none !important; }
              [data-ogsc] .logo-light { display: block !important; }
              [data-ogsb] .logo-dark { display: none !important; }
              [data-ogsb] .logo-light { display: block !important; }
          </style>
          </head>
      <body style="margin:0; padding:0; background-color:#ffffff; font-family:'Plus Jakarta Sans', system-ui, Arial, sans-serif; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">

          <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" width="600" class="wrapper" style="margin:0 auto; background-color:#ffffff; width:600px; max-width:600px;">

              <!-- HEADER -->
              <tr>
                  <td style="padding: 25px 20px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                              <td align="left">
                                  <a href="https://www.bricklyhomes.com" target="_blank">
                                      <img src="https://www.bricklyhomes.com/newsletters/iconos/logo_negro.png" alt="Brickly Homes" width="150" style="display:block; border:0; font-family:sans-serif; font-size:18px; line-height:20px; color:#111111; font-weight:bold;" class="logo-dark">
                                      <img src="https://www.bricklyhomes.com/newsletters/iconos/logo_blanco.png" alt="Brickly Homes" width="150" style="display:none; border:0; font-family:sans-serif; font-size:18px; line-height:20px; color:#111111; font-weight:bold;" class="logo-light">
                                  </a>
                              </td>
                              <td align="right" style="vertical-align: middle;">
                                  <img src="https://www.bricklyhomes.com/newsletters/iconos/newsletter.png" alt="Contacto" width="24" height="24" style="display:block; border:0;">
                              </td>
                          </tr>
                      </table>
                  </td>
              </tr>

              <!-- PROPIEDAD VISTA -->
              <tr>
                  <td style="padding: 0 20px 35px 20px;">
                      <div style="background-color:#f8f9fa; border-radius: 24px; overflow: hidden; font-size: 0; max-width: 560px;">
                          <div style="display: block; width: 100%; max-width: 560px; font-size: 14px;">
                              <img src="${viewedPhoto}" alt="${viewedTitle}" class="img-full" style="display:block; width:100%; height:auto; border:0;">
                          </div>
                          <div class="padding-mobile" style="padding: 25px 25px 30px 25px; font-size: 14px;">
                              <p style="margin: 0 0 12px 0; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; color: #999999; font-weight: 700;">${zone ? `Viste esta propiedad en la Zona ${zone}` : 'Viste esta propiedad'}</p>
                              ${this.recommendationDescriptionBlock(viewed, '26px', false)}
                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:16px;">
                                  <tr>
                                      <td align="center" style="background-color: #000000; border-radius: 20px;">
                                          <a href="${viewedLink}" target="_blank" style="padding: 12px 35px; display: block; font-size: 14px; font-weight: bold; color: #ffffff; text-decoration: none;">Ver propiedad</a>
                                      </td>
                                  </tr>
                              </table>
                          </div>
                      </div>
                      </td>
              </tr>

              <!-- TÍTULO RECOMENDADAS -->
              <tr>
                  <td align="center" style="padding: 15px 20px 30px 20px;">
                      <h2 style="margin: 0; font-size: 24px; line-height: 30px; color: #111111; font-weight: 700;">Te recomendamos estas propiedades${zone ? `<br />en la Zona ${zone}` : ''}</h2>
                  </td>
              </tr>

              <!-- LISTA DE RECOMENDADAS -->
              <tr>
                  <td style="padding: 0 20px 40px 20px; font-size: 0;">
                      ${cards}
                      </td>
              </tr>

              <!-- CTA -->
              <tr>
                  <td align="center" style="padding: 10px 20px 45px 20px; border-bottom: 1px solid #eeeeee;">
                      <h2 style="margin: 0 0 10px 0; font-size: 24px; line-height: 28px; color: #111111; font-weight: 700;">¿Listo para encontrar tu próximo hogar?</h2>
                      <p style="margin: 0 0 25px 0; font-size: 14px; line-height: 20px; color: #555555; max-width: 440px;">Explora más opciones que se ajustan a ti desde nuestra plataforma.</p>

                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                          <tr>
                              <td align="center" style="background-color: #000000; border-radius: 20px;">
                                  <a href="https://www.bricklyhomes.com/propiedades" target="_blank" style="padding: 12px 35px; display: block; font-size: 14px; font-weight: bold; color: #ffffff; text-decoration: none;">Explorar más propiedades</a>
                              </td>
                          </tr>
                      </table>
                  </td>
              </tr>

              <!-- FOOTER -->
              <tr>
                  <td style="background-color: #1a2129; padding: 40px 20px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                              <td style="font-size: 0;">
                                  <div class="col-50 text-center-mobile" style="display: inline-block; width: 100%; max-width: 280px; vertical-align: middle; margin-bottom: 20px;">
                                      <a href="https://www.bricklyhomes.com" target="_blank">
                                          <img src="https://www.bricklyhomes.com/newsletters/iconos/logo_blanco.png" alt="Brickly Homes" width="130" style="border:0; display: inline-block;">
                                      </a>
                                  </div>

                                  <div class="col-50 text-center-mobile" style="display: inline-block; width: 100%; max-width: 280px; vertical-align: middle; text-align: right; margin-bottom: 20px;">
                                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="display:inline-block;">
                                          <tr>
                                              <td style="padding: 0 10px;"><a href="https://www.facebook.com/profile.php?id=61588999228778" target="_blank"><img src="https://www.bricklyhomes.com/newsletters/iconos/FB.png" alt="Facebook" width="20" height="20"></a></td>
                                              <td style="padding: 0 10px;"><a href="https://wa.me/50237649719?text=%C2%A1Hola!%20Deseo%20contactar%20a%20un%20asesor." target="_blank"><img src="https://www.bricklyhomes.com/newsletters/iconos/WS.png" alt="WhatsApp" width="20" height="20"></a></td>
                                              <td style="padding: 0 10px;"><a href="https://www.instagram.com/bricklyoficial/" target="_blank"><img src="https://www.bricklyhomes.com/newsletters/iconos/IG.png" alt="Instagram" width="20" height="20"></a></td>
                                              <td style="padding: 0 10px;"><a href="https://www.linkedin.com/company/bricklygt/" target="_blank"><img src="https://www.bricklyhomes.com/newsletters/iconos/IN.png" alt="LinkedIn" width="20" height="20"></a></td>
                                              <td style="padding: 0 10px;"><a href="https://www.tiktok.com/@bricklyhomes?_r=1&_t=ZP-95NIrCBiYAQ" target="_blank"><img src="https://www.bricklyhomes.com/newsletters/iconos/TT.png" alt="TikTok" width="20" height="20"></a></td>
                                          </tr>
                                      </table>
                                  </div>

                                  </td>
                          </tr>
                          <tr>
                              <td align="center" style="border-top: 1px solid #2d3743; padding-top: 25px; font-size: 12px; color: #a0aec0; line-height: 18px;">
                                  <p style="margin: 0 0 10px 0;">© Brickly. Todos los derechos reservados</p>
                                  <p style="margin: 0;">¿No quieres recibir más correos? <a href="#" style="color:#ffffff; text-decoration:underline;">Darse de baja</a></p>
                              </td>
                          </tr>
                      </table>
                  </td>
              </tr>

          </table>

      </body>
      </html>
    `;
  }

  async activateFeatured(propertyId: string, isActive: boolean, userId?: string) {

    const property = await this.propertyModel.findById(propertyId);

    if (!property) throw new NotFoundException('Propiedad no encontrada');

    if (userId && property.userId.toString() !== userId) {
      throw new ForbiddenException('No puedes destacar esta propiedad');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    property.featured = {
      isActive: isActive,
      expiresAt
    };

    await property.save();

    return property;
  }
  async getTotalProperties(userId: string){

    const mainUserIdObj = new Types.ObjectId(userId);

      // 1. Obtener todos los IDs de los subusuarios de forma anticipada
      const subUsersRaw = await this.userModel.find(
        { parentId: mainUserIdObj },
        { _id: 1 }
      ).lean();
      
      const subUserIdsObj = subUsersRaw.map(user => user._id);

      // Array unificado de ObjectIds (Usuario principal + Subusuarios)
      const allowedUserIds = [mainUserIdObj, ...subUserIdsObj];

      // 2. Cálculo de propiedades totales usando el nuevo array de pertenencia
      const totalPublished =
        await this.propertyModel.countDocuments({
          userId: { $in: allowedUserIds }, 
          status: 'published',
        });

      const total =
        await this.propertyModel.countDocuments({
          userId: { $in: allowedUserIds }, 
        });

        return { total, totalPublished }

  }
  async getMetrics(userId: string, from?: string, to?: string) {
      const now = new Date();
      const startCurrentMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        1,
      );
      const startPreviousMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1,
      );

      const mainUserIdObj = new Types.ObjectId(userId);

      // 1. Obtener todos los IDs de los subusuarios de forma anticipada
      const subUsersRaw = await this.userModel.find(
        { parentId: mainUserIdObj },
        { _id: 1 }
      ).lean();
      
      const subUserIdsObj = subUsersRaw.map(user => user._id);

      // Array unificado de ObjectIds (Usuario principal + Subusuarios)
      const allowedUserIds = [mainUserIdObj, ...subUserIdsObj];

      // 2. Cálculo de propiedades totales usando el nuevo array de pertenencia
      const totalProperties =
        await this.propertyModel.countDocuments({
          userId: { $in: allowedUserIds }, 
          status: 'published',
        });

      const totalUntilPreviousMonth =
        await this.propertyModel.countDocuments({
          userId: { $in: allowedUserIds },
          status: 'published',
          createdAt: {
            $lt: startCurrentMonth,
          },
        });

      let growthPercentage = 0;
      if (totalUntilPreviousMonth > 0) {
        growthPercentage =
          (
            (totalProperties -
              totalUntilPreviousMonth) /
            totalUntilPreviousMonth
          ) * 100;
      } else if (totalProperties > 0) {
        growthPercentage = 100;
      }

      // Agregaciones de Propiedades filtradas por el grupo familiar/empresa
      const propertiesByType =
        await this.propertyModel.aggregate([
          {
            $match: {
              userId: { $in: allowedUserIds },
              status: 'published',
            },
          },
          {
            $group: {
              _id: '$market.type',
              total: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              type: '$_id',
              total: 1,
            },
          },
        ]);

      const propertiesByOperation =
        await this.propertyModel.aggregate([
          {
            $match: {
              userId: { $in: allowedUserIds },
              status: 'published',
            },
          },
          {
            $group: {
              _id: '$market.mode',
              total: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              operation: '$_id',
              total: 1,
            },
          },
        ]);

      const propertiesByDepartment =
        await this.propertyModel.aggregate([
          {
            $match: {
              userId: { $in: allowedUserIds },
              status: 'published',
            },
          },
          {
            $group: {
              _id: '$location.department',
              total: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              department: '$_id',
              total: 1,
            },
          },
        ]);

      const agenciaMD = await this.userModel.findById(userId);
      let clickCounterAgency = 0;
      let clickCounterWsAgency = 0;
      if (!agenciaMD) {
        throw new Error('Agencia no encontrada');
      }
      if (agenciaMD.clickCounter) {
        clickCounterAgency = agenciaMD.clickCounter;
      }
      if (agenciaMD.clickCounterWs) {
        clickCounterWsAgency = agenciaMD.clickCounterWs;
      }

      // Sumar visitas y clicks de todas las propiedades pertenecientes al grupo
      const totals =
        await this.propertyModel.aggregate([
          {
            $match: {
              userId: { $in: allowedUserIds },
              status: 'published',
            },
          },
          {
            $group: {
              _id: null,
              totalVisits: {
                $sum: '$visitCounter',
              },
              totalClicks: {
                $sum: '$clickCounter',
              },
            },
          },
        ]);

      const totalsAg =
        await this.userModel.aggregate([
          {
            $match: {
              parentId: mainUserIdObj,
            },
          },
          {
            $group: {
              _id: null,
              totalClicksWs: {
                $sum: '$clickCounterWs',
              },
              totalClicks: {
                $sum: '$clickCounter',
              },
            },
          },
        ]);

      let totalVisits = totals[0]?.totalVisits || 0;
      const totalClicksAg = totalsAg[0]?.totalClicks || 0;
      const totalClicksWsAg = totalsAg[0]?.totalClicksWs || 0;
      let totalClicks = Number(clickCounterAgency) + Number(totalClicksAg);
      let totalClicksWs = Number(clickCounterWsAgency) + Number(totalClicksWsAg);

      // Obtener IDs de propiedades globalizados (Principal + Subusuarios) para Favoritos
      const propertyIds = await this.propertyModel.find(
        { userId: { $in: allowedUserIds }, status: 'published' },
        { _id: 1 },
      );
      const ids = propertyIds.map(
        property => property._id,
      );

      // === SOBREESCRIBIR CONTADORES CON ACTIVITY LOGS SI HAY FILTRO DE FECHAS ===
      if (from || to) {
        const createdFrom = from ? new Date(from) : undefined;
        const createdTo = to ? new Date(to) : undefined;

        totalVisits = await this.activityLogsService.countByDateRange({
          type: 'property',
          action: 'visit',
          userIds: ids,
          createdFrom,
          createdTo,
        });

        totalClicks = await this.activityLogsService.countByDateRange({
          type: 'user',
          action: 'click',
          userIds: allowedUserIds,
          createdFrom,
          createdTo,
        });

        totalClicksWs = await this.activityLogsService.countByDateRange({
          type: 'user',
          action: 'click-ws',
          userIds: allowedUserIds,
          createdFrom,
          createdTo,
        });
      }

      const totalFavorites =
        await this.userModel.countDocuments({
          favorites: {
            $in: ids,
          },
        });

      const favoriteAgg =
        await this.userModel.aggregate([
          {
            $project: {
              matchedFavorites: {
                $filter: {
                  input: '$favorites',
                  as: 'favorite',
                  cond: {
                    $in: ['$$favorite', ids],
                  },
                },
              },
            },
          },
          {
            $project: {
              total: {
                $size: { $ifNull: ['$matchedFavorites', []] }, // Corregido bug original: $size en vez de retornar el array completo al $sum
              },
            },
          },
          {
            $group: {
              _id: null,
              totalFavoritesAll: {
                $sum: '$total',
              },
            },
          },
        ]);

      const totalFavoritesAll = favoriteAgg[0]?.totalFavoritesAll || 0;

      // Tops de propiedades unificados
      const topPropertiesRaw =
        await this.propertyModel
          .find(
            { userId: { $in: allowedUserIds }, status: 'published' },
            {
              visitCounter: 1,
              market: 1,
              media: 1,
            },
          )
          .sort({ visitCounter: -1 })
          .limit(5)
          .lean();

      const topProperties: any = {};
      topPropertiesRaw.forEach((property, index) => {
        topProperties[(index + 1).toString()] = {
          id: property._id,
          name: property.market?.title || '',
          price: property.market?.price || 0,
          priceUSD: property.market?.priceUSD || 0,
          picture:
            property.media?.photos?.find(
              (photo: any) => photo.isMain,
            )?.path ||
            property.media?.photos?.[0]?.path ||
            '',
          visitCounter: property.visitCounter || 0,
        };
      });

      const topPropertiesRawMinus =
        await this.propertyModel
          .find(
            { userId: { $in: allowedUserIds }, status: 'published' },
            {
              visitCounter: 1,
              market: 1,
              media: 1,
            },
          )
          .sort({ visitCounter: 1 })
          .limit(5)
          .lean();

      const topPropertiesMinus: any = {};
      topPropertiesRawMinus.forEach((property, index) => {
        topPropertiesMinus[(index + 1).toString()] = {
          id: property._id,
          name: property.market?.title || '',
          price: property.market?.price || 0,
          priceUSD: property.market?.priceUSD || 0,
          picture:
            property.media?.photos?.find(
              (photo: any) => photo.isMain,
            )?.path ||
            property.media?.photos?.[0]?.path ||
            '',
          visitCounter: property.visitCounter || 0,
        };
      });

      // Top de Agentes asociados (Se mantiene buscando los que dependen de tu parentId)
      const topAgentsRaw = await this.userModel.aggregate([
        {
          $match: {
            parentId: mainUserIdObj,
          },
        },
        {
          $lookup: {
            from: 'properties',
            let: { userIdStr: { $toString: '$_id' } },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ['$$userIdStr', { $ifNull: ['$agents', []] }]
                  }
                }
              },
              {
                $project: { _id: 1 }
              }
            ],
            as: 'assignedProperties',
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            avatar: 1,
            ratingAverage: 1,
            ratingCount: 1,
            clickCounterWs: 1,
            clickCounter: 1,
            propertiesAssign: {
              $size: {
                $ifNull: ['$assignedProperties', []],
              },
            },
          },
        },
        {
          $sort: {
            ratingAverage: -1,
            ratingCount: -1,
            propertiesAssign: -1,
          },
        },
      ]);

      const topAgents: any = {};
      topAgentsRaw.forEach((agent, index) => {
        topAgents[(index + 1).toString()] = {
          id: agent._id,
          name: agent.name || '',
          avatar: agent.avatar || '',
          ratingAverage: agent.ratingAverage || 0,
          ratingCount: agent.ratingCount || 0,
          clickCounterWs: agent.clickCounterWs || 0,
          clickCounter: agent.clickCounter || 0,
          propertiesAssign: agent.propertiesAssign || 0,
        };
      });

      return {
        totalProperties,
        growthPercentage: Number(growthPercentage.toFixed(2)),
        propertiesByType,
        propertiesByOperation,
        propertiesByDepartment,
        totalVisits,
        totalClicks,
        totalClicksWs,
        totalFavorites,
        totalFavoritesAll,
        topProperties,
        topPropertiesMinus, 
        topAgents,
      };
    }

  async getAgentMetrics(agentId: string, from?: string, to?: string) {

        const objectId = agentId;//new Types.ObjectId(agentId);

        // =========================
        // AGENTE
        // =========================

        const agent = await this.userModel.findById(agentId);

        if (!agent) {
          throw new Error('Agente no encontrado');
        }

        // =========================
        // PROPIEDADES ASIGNADAS
        // =========================

        const assignedProperties = await this.propertyModel.countDocuments({
          agents: objectId,
        });

        // =========================
        // POR TIPO
        // =========================

        const propertiesByType = await this.propertyModel.aggregate([
          {
            $match: {
              agents: objectId,
              status :'published',
            },
          },
          {
            $group: {
              _id: '$market.type',
              total: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              type: '$_id',
              total: 1,
            },
          },
        ]);

        // =========================
        // POR OPERACION
        // =========================

        const propertiesByOperation = await this.propertyModel.aggregate([
          {
            $match: {
              agents: objectId,
              status :'published',
            },
          },
          {
            $group: {
              _id: '$market.mode',
              total: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              operation: '$_id',
              total: 1,
            },
          },
        ]);

        // =========================
        // TOP 5 PROPIEDADES MAS VISTAS
        // =========================

        const topPropertiesRaw = await this.propertyModel
          .find({
            agents: objectId,
          })
          .sort({ visitCounter: -1 })
          .limit(5)
          .select({
            'market.title': 1,
            'market.price': 1,
            'market.priceUSD': 1,
            'media.photos': 1,
            visitCounter: 1,
          });

        const topProperties: any = {};

        topPropertiesRaw.forEach((property, index) => {

          const mainPicture =
            property.media?.photos?.find((p: any) => p.isMain)?.path ||
            property.media?.photos?.[0]?.path ||
            null;

          topProperties[(index + 1).toString()] = {
            id: property._id,
            name: property.market?.title || '',
            price: property.market?.price || 0,
            priceUSD: property.market?.priceUSD || 0,
            picture: mainPicture,
            visitCounter: property.visitCounter || 0,
          };
        });

        // =========================
        // TOP 5 PROPIEDADES MENOS VISTAS
        // =========================

        const topPropertiesRawmin = await this.propertyModel
          .find({
            agents: objectId,
          })
          .sort({ visitCounter: 1 })
          .limit(5)
          .select({
            'market.title': 1,
            'market.price': 1,
            'market.priceUSD': 1,
            'media.photos': 1,
            visitCounter: 1,
          });

        const topPropertiesMinus: any = {};

        topPropertiesRawmin.forEach((property, index) => {

          const mainPicturemin =
            property.media?.photos?.find((p: any) => p.isMain)?.path ||
            property.media?.photos?.[0]?.path ||
            null;

          topPropertiesMinus[(index + 1).toString()] = {
            id: property._id,
            name: property.market?.title || '',
            price: property.market?.price || 0,
            priceUSD: property.market?.priceUSD || 0,
            picture: mainPicturemin,
            visitCounter: property.visitCounter || 0,
          };
        });

        // =========================
        // RESPONSE
        // =========================

        let totalClicks = agent.clickCounter || 0;
        let totalClicksWs = agent.clickCounterWs || 0;

        // === SOBREESCRIBIR CON ACTIVITY LOGS SI HAY FILTRO DE FECHAS ===
        if (from || to) {
          const createdFrom = from ? new Date(from) : undefined;
          const createdTo = to ? new Date(to) : undefined;

          totalClicks = await this.activityLogsService.countByDateRange({
            type: 'user',
            action: 'click',
            userIds: [new Types.ObjectId(agentId)],
            createdFrom,
            createdTo,
          });

          totalClicksWs = await this.activityLogsService.countByDateRange({
            type: 'user',
            action: 'click-ws',
            userIds: [new Types.ObjectId(agentId)],
            createdFrom,
            createdTo,
          });
        }

        return {
          totalClicksWs,
          totalClicks,
          rating: {
            average: agent.ratingAverage || 0,
            total: agent.ratingCount || 0,
          },
          assignedProperties,
          propertiesByType,
          propertiesByOperation,
          topProperties,
          topPropertiesMinus,
        };
      }


  async getMetricsAdm(from?: string, to?: string){
    // =========================
    // TOTAL AGENCIAS
    // =========================

    const totalAgencies = await this.userModel.countDocuments({
          roles: 'agencia' as any,
        });

    // =========================
    // TOTAL Agentes
    // =========================

    const totalAgents = await this.userModel.countDocuments({
          roles: 'agente' as any,
        });

    // =========================
    // TOTAL AGENTES VERIFICADOS
    // =========================

    const totalAgentsVerified = await this.userModel.countDocuments({
          roles: 'agente' as any,
          "agentInfo.verified": true
        });
 

    //===========================
    //TOTAL AGENTES DESTACADOS
    //==========================

    const totalAgentsFeatured = await this.userModel.countDocuments({
          roles: 'agente' as any,
          featured_expire: {
              $gt: new Date(),
            },
        });


    //===========================
    //TOTAL AGENCIAS DESTACADAS
    //==========================

    const totalAgenciesFeatured =await this.userModel.countDocuments({
          roles: 'agencia' as any,
          featured_expire: {
              $gt: new Date(),
            },
        });

    // =========================
    // TOTAL PROPIEDADES PUBLICADAS
    // =========================

    const totalPropertiesPublished =
        await this.propertyModel.countDocuments({
           status :'published',
        });
    
    //===========================
    //TOTAL PROPIEDADES DESTACADAS
    //==========================

    const totalPropertiesFeatured = await this.propertyModel.countDocuments({
          status :'published',
          'featured.expiresAt': {
              $gt: new Date(),
            },
        });

    //========================================
    // TOTAL DE PROPIEDADES CREADAS ESTE MES
    //=========================================
    const nowDatep = new Date();

    const startOfMonth = new Date(
      nowDatep.getFullYear(),
      nowDatep.getMonth(),
      1,
      0,
      0,
      0,
      0,
    );

    const startOfNextMonth = new Date(
      nowDatep.getFullYear(),
      nowDatep.getMonth() + 1,
      1,
      0,
      0,
      0,
      0,
    );

    const totalPropertiesThisMonth =
      await this.propertyModel.countDocuments({
        status: 'published',
        createdAt: {
          $gte: startOfMonth,
          $lt: startOfNextMonth,
        },
      });
    
    // =========================
    // PROPIEDADES POR TIPO
    // =========================

      const propertiesByType =
        await this.propertyModel.aggregate([
          {
            $match: {
              status :'published',
            },
          },
          {
            $group: {
              _id: '$market.type',
              total: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              type: '$_id',
              total: 1,
            },
          },
        ]);

      // =========================
      // PROPIEDADES POR OPERACION
      // =========================

      const propertiesByOperation =
        await this.propertyModel.aggregate([
          {
            $match: {
              status :'published',
            },
          },
          {
            $group: {
              _id: '$market.mode',
              total: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              operation: '$_id',
              total: 1,
            },
          },
        ]);

      // =========================
      // PROPIEDADES POR DEPARTAMENTO
      // =========================

      const propertiesByDepartment =
        await this.propertyModel.aggregate([
          {
            $match: {
              status :'published',
            },
          },
          {
            $group: {
              _id: '$location.department',
              total: { $sum: 1 },
            },
          },
          {
            $project: {
              _id: 0,
              department: '$_id',
              total: 1,
            },
          },
        ]);

    ///////////////////////////
    // TOTAL VISITAS Y CLICKS
    //////////////////////////

        const totalspropertyVisit =
        await this.propertyModel.aggregate([
          {
            $match: {
              status :'published',
            },
          },
          {
            $group: {
              _id: null,
              totalVisits: {
                $sum: '$visitCounter',
              },
            },
          },
        ]);

        const totalsClicksUsAg =
        await this.userModel.aggregate([
          {
            $match: {
              roles:  'agencia',
            },
          },
          {
            $group: {
              _id: null,
              totalClicksWs: {
                $sum: '$clickCounterWs',
              },
              totalClicks: {
                $sum: '$clickCounter',
              },
            },
          },
        ]);

        const totalsClicksUsAgt =
        await this.userModel.aggregate([
          {
            $match: {
              roles:  'agente',
            },
          },
          {
            $group: {
              _id: null,
              totalClicksWs: {
                $sum: '$clickCounterWs',
              },
              totalClicks: {
                $sum: '$clickCounter',
              },
            },
          },
        ]);

      const totalClicksAg =
        totalsClicksUsAg[0]?.totalClicks || 0;

      const totalClicksWsAg =
      totalsClicksUsAg[0]?.totalClicksWs || 0;

      const totalClicksAgt =
      totalsClicksUsAgt[0]?.totalClicks || 0;

      const totalClicksWsAgt =
      totalsClicksUsAgt[0]?.totalClicksWs || 0;

      let totalClicks = Number(totalClicksAg) + Number(totalClicksAgt);
      let totalClicksWs = Number(totalClicksWsAg) + Number(totalClicksWsAgt);
      let totalVisits = totalspropertyVisit[0]?.totalVisits || 0;

      // === SOBREESCRIBIR CON ACTIVITY LOGS SI HAY FILTRO DE FECHAS ===
      if (from || to) {
        const createdFrom = from ? new Date(from) : undefined;
        const createdTo = to ? new Date(to) : undefined;

        const allProperties = await this.propertyModel.find(
          { status: 'published' },
          { _id: 1 },
        );
        const allPropertyObjectIds = allProperties.map(p => p._id);

        totalVisits = await this.activityLogsService.countByDateRange({
          type: 'property',
          action: 'visit',
          userIds: allPropertyObjectIds,
          createdFrom,
          createdTo,
        });

        totalClicks = await this.activityLogsService.countByDateRange({
          type: 'user',
          action: 'click',
          createdFrom,
          createdTo,
        });

        totalClicksWs = await this.activityLogsService.countByDateRange({
          type: 'user',
          action: 'click-ws',
          createdFrom,
          createdTo,
        });
      }

      // =========================
      // Top 5 Agents
      // =========================

        const topAgentsRaw = await this.userModel.aggregate([
          {
            $match: {
              roles:  'agente',
            },
          },

          // buscar propiedades asignadas
          {
            $lookup: {
              from: 'properties',
              localField: '_id',
              foreignField: 'agents',
              as: 'assignedProperties',
            },
          },

          {
            $project: {
              _id: 1,
              name: 1,
              avatar: 1,
              ratingAverage: 1,
              ratingCount: 1,
              clickCounterWs: 1,
              clickCounter: 1,

              propertiesAssign: {
                $size: {
                  $ifNull: ['$assignedProperties', []],
                },
              },
            },
          },

          {
            $sort: {
              ratingAverage: -1,
              ratingCount: -1,
              propertiesAssign: -1
            },
          },

          {
            $limit: 5,
          },
        ]);

        const topAgents: any = {};

        topAgentsRaw.forEach((agent, index) => {
          topAgents[(index + 1).toString()] = {
            id: agent._id,

            name: agent.name || '',

            avatar: agent.avatar || '',

            ratingAverage:
              agent.ratingAverage || 0,

            ratingCount:
              agent.ratingCount || 0,

            clickCounterWs:
              agent.clickCounterWs || 0,

            clickCounter:
              agent.clickCounter || 0,

            propertiesAssign:
              agent.propertiesAssign || 0,
          };
        });



    return {
      totalAgencies,
      totalAgents,
      totalAgentsFeatured,
      totalAgentsVerified,
      totalAgenciesFeatured,
      totalPropertiesPublished,
      totalPropertiesThisMonth,
      totalPropertiesFeatured,
      propertiesByType,
      propertiesByOperation,
      propertiesByDepartment,
      totalVisits,
      totalClicks,
      totalClicksWs,
      topAgents,

    }
  }
  async getAgentPropertiesReport(agencyId: string) {
    
    return this.propertyModel.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(agencyId),
        },
      },

      {
        $unwind: '$agents',
      },
      {
        $addFields: {
          agents: {
            $toObjectId: '$agents'
          }
        }
      },

      // Agrupar por agente + estado
      {
        $group: {
          _id: {
            agentId: '$agents',
            status: '$status',
          },
          count: {
            $sum: 1,
          },
        },
      },

      // Agrupar nuevamente por agente
      {
        $group: {
          _id: '$_id.agentId',

          totalProperties: {
            $sum: '$count',
          },

          statuses: {
            $push: {
              k: '$_id.status',
              v: '$count',
            },
          },
        },
      },

      // Convertir array a objeto
      {
        $addFields: {
          statuses: {
            $arrayToObject: '$statuses',
          },
        },
      },

      // Obtener información del agente
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'agent',
        },
      },

      {
        $unwind: '$agent',
      },

      {
        $project: {
          _id: 0,
          userId: '$_id',
          name: '$agent.name',
          email: '$agent.email',
          roles: '$agent.roles',
          totalProperties: 1,
          statuses: 1,
        },
      },

      {
        $sort: {
          totalProperties: -1,
        },
      },
    ]);
  }
  async getPriceRange() {

        const result =
          await this.propertyModel.aggregate([
            {
              $match: {
                status: 'published',
              },
            },
            {
              
              $group: {
                _id: null,

                minPrice: {
                  $min: '$market.price',
                },

                maxPrice: {
                  $max: '$market.price',
                },

                minPriceUSD: {
                  $min: '$market.priceUSD',
                },

                maxPriceUSD: {
                  $max: '$market.priceUSD',
                },
                minSizeLandM2: {
                  $min: '$dimensions.landM2',
                },
                maxSizeLandM2: {
                  $max: '$dimensions.landM2',
                },
                minSizeConstructionM2: {
                  $min: '$dimensions.constructionM2',
                },
                maxSizeConstructionM2: {
                  $max: '$dimensions.constructionM2',
                },
                minSizeStorageM2: {
                  $min: '$dimensions.storageM2',
                },
                maxSizeStorageM2: {
                  $max: '$dimensions.storageM2',
                },
              },
            },
          ]);

        if (!result.length) {
          return {
            price: {
              minPrice: 0,
              maxPrice: 0,
              minPriceUSD: 0,
              maxPriceUSD: 0,
            },
            size:{
              minSizeLandM2:0,
              maxSizeLandM2:0,
              minSizeConstructionM2:0,
              maxSizeConstructionM2:0,
              minSizeStorageM2:0,
              maxSizeStorageM2:0,

            }
          };
        }

        return {
          price:{
            minPrice: result[0].minPrice,
            maxPrice: result[0].maxPrice,
            minPriceUSD: result[0].minPriceUSD,
            maxPriceUSD: result[0].maxPriceUSD,
          },
          size:{
            minSizeLandM2: result[0].minSizeLandM2,
            maxSizeLandM2: result[0].maxSizeLandM2,
            minSizeConstructionM2 : result[0].minSizeConstructionM2,
            maxSizeConstructionM2 : result[0].maxSizeConstructionM2,
            minSizeStorageM2 : result[0].minSizeStorageM2,
            maxSizeStorageM2 : result[0].maxSizeStorageM2
          }
        };
      }

  async getLocationsTree() {
    const rows = await this.propertyModel.aggregate([
      {
        $match: {
          status: 'published',
        },
      },
      {
        $group: {
          _id: {
            department: '$location.department',
            municipality: '$location.municipality',
            zone: '$location.zone',
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const normalize = (value) => {
      const str = String(value ?? '').trim();
      if (!str) return null;
      return ['ninguno', 'nunguno', 'none'].includes(str.toLowerCase()) ? null : str;
    };

    type ZoneEntry = { name: string; count: number };
    type MuniEntry = { name: string; count: number; zones: Map<string, ZoneEntry> };
    type DeptEntry = { name: string; count: number; municipalities: Map<string, MuniEntry> };

    const departments = new Map<string, DeptEntry>();

    for (const row of rows) {
      const department = normalize(row._id.department);
      if (!department) continue;

      const municipality = normalize(row._id.municipality);
      const zone = normalize(row._id.zone);
      const count = row.count || 0;

      let deptEntry = departments.get(department);
      if (!deptEntry) {
        deptEntry = {
          name: department,
          count: 0,
          municipalities: new Map<string, MuniEntry>(),
        };
        departments.set(department, deptEntry);
      }
      deptEntry.count += count;

      if (!municipality) continue;

      let muniEntry = deptEntry.municipalities.get(municipality);
      if (!muniEntry) {
        muniEntry = {
          name: municipality,
          count: 0,
          zones: new Map<string, ZoneEntry>(),
        };
        deptEntry.municipalities.set(municipality, muniEntry);
      }
      muniEntry.count += count;

      if (!zone) continue;

      let zoneEntry = muniEntry.zones.get(zone);
      if (!zoneEntry) {
        zoneEntry = { name: zone, count: 0 };
        muniEntry.zones.set(zone, zoneEntry);
      }
      zoneEntry.count += count;
    }

    const sortByName = (a, b) =>
      a.name.localeCompare(b.name, 'es', { numeric: true });

    return Array.from(departments.values())
      .sort(sortByName)
      .map((dept) => ({
        name: dept.name,
        count: dept.count,
        municipalities: Array.from(dept.municipalities.values())
          .sort(sortByName)
          .map((muni) => ({
            name: muni.name,
            count: muni.count,
            zones: Array.from(muni.zones.values()).sort(sortByName),
          })),
      }));
  }

  async disablePropertiesByPlan(userId: string) {
    const mainUserIdObj = new Types.ObjectId(userId);
    const subUsers = await this.userModel.find(
      { parentId: mainUserIdObj },
      { _id: 1 },
    ).lean();
    const subUserIds = subUsers.map(u => u._id);
    const allUserIds = [mainUserIdObj, ...subUserIds];

    await this.propertyModel.updateMany(
      { userId: { $in: allUserIds }, status: 'published' },
      { $set: { status: 'disabled', disabledByPlan: true } },
    );
  }

  async reactivatePropertiesByPlan(userId: string) {
    const mainUserIdObj = new Types.ObjectId(userId);
    const subUsers = await this.userModel.find(
      { parentId: mainUserIdObj },
      { _id: 1 },
    ).lean();
    const subUserIds = subUsers.map(u => u._id);
    const allUserIds = [mainUserIdObj, ...subUserIds];

    await this.propertyModel.updateMany(
      { userId: { $in: allUserIds }, disabledByPlan: true },
      { $set: { status: 'published', disabledByPlan: false } },
    );
  }

  async reactivatePropertiesByPlanForUser(userId: string) {
    await this.propertyModel.updateMany(
      { userId: new Types.ObjectId(userId), disabledByPlan: true },
      { $set: { status: 'published', disabledByPlan: false } },
    );
  }

  private getPropertySlugSource(property: any) {
    return property?.market?.title || property?.folderId || 'propiedad';
  }

  private normalizePropertySlug(value: string) {
    const base = String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-')
      .slice(0, 100)
      .replace(/-+$/g, '');

    const slug = base || 'propiedad';
    return this.reservedPropertySlugs.has(slug) ? `${slug}-propiedad` : slug;
  }

  private reservedPropertySlugs = new Set([
    'metricas',
    'metricas-adm',
    'var-ranges',
    'count',
    'add',
    'edit',
    'view',
    'planes',
    'propiedad',
    'propiedades',
    'api',
  ]);

  private isObjectId(value: string) {
    return /^[a-f\d]{24}$/i.test(value);
  }

  private getPropertyId(property: any) {
    return property?._id?.toString?.() || property?._id || null;
  }

  private async ensureUniquePropertySlug(value: string, propertyId?: string) {
    const baseSlug = this.normalizePropertySlug(value);
    let candidate = baseSlug;
    let suffix = 2;

    while (
      await this.propertyModel.exists({
        propertySlug: candidate,
        ...(propertyId ? { _id: { $ne: propertyId } } : {}),
      })
    ) {
      candidate = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  private async ensurePropertySlugForProperty(property: any) {
    if (!property) return property;
    if (property.propertySlug) return property;

    const propertyId = this.getPropertyId(property);
    if (!propertyId) return property;

    const propertySlug = await this.ensureUniquePropertySlug(
      this.getPropertySlugSource(property),
      propertyId,
    );

    if (typeof property.set === 'function' && typeof property.save === 'function') {
      property.set('propertySlug', propertySlug);
      await property.save();
      return property;
    }

    await this.propertyModel.updateOne({ _id: propertyId }, { $set: { propertySlug } });
    return { ...property, propertySlug };
  }

  private async ensurePropertySlugsForProperties(properties: any[]) {
    return Promise.all(
      properties.map((property) => this.ensurePropertySlugForProperty(property)),
    );
  }
}

import {
  Injectable,
  BadRequestException,
  Delete,
} from '@nestjs/common';

import axios from 'axios';

import {
  InjectModel,
} from '@nestjs/mongoose';

import {
  Model,
  Types,
} from 'mongoose';

import {
  Property,
} from '../properties/schemas/property.schema';

import {
  User,
} from '../users/user.schema';

import { FileManagerService } from '../fileuploads/file-manager.service';
import { nanoid, customAlphabet } from 'nanoid';

const folderIdGenerator =
  customAlphabet(
    'abcdefghijklmnopqrstuvwxyz0123456789',
    10,
  );

@Injectable()
export class EasybrokerService {
  private API_URL =
    'https://api.easybroker.com/v1';

  constructor(
    @InjectModel(Property.name)
    private propertyModel: Model<Property>,

    @InjectModel(User.name)
    private userModel: Model<User>,

    private fileManager: FileManagerService,
  ) {}

  async syncUserProperties(userId: string) {
    const user =
      await this.userModel.findById(userId);

    if (!user) {
      throw new BadRequestException(
        'Usuario no encontrado',
      );
    }

    if (!user.easyBrokerApiKey) {
      throw new BadRequestException(
        'El usuario no tiene API KEY de EasyBroker',
      );
    }

    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await axios.get(
        `${this.API_URL}/properties?page=${page}&search[statuses][]=published`,
        {
          headers: {
            'X-Authorization':
              user.easyBrokerApiKey,
            'Content-Type':
              'application/json',
          },
        },
      );

      const data = response.data;

      for (const item of data.content) {
        await this.sleep(500);
        
        const detail =
          await this.getPropertyDetail(
            item.public_id,
            user.easyBrokerApiKey,
          );
          
          await this.saveProperty(
            user._id.toString(),
            detail,
          );
      }

      hasMore =
        data.pagination?.next_page != null;

      page++;
    }

    user.easyBrokerLastSync = new Date();

    await user.save();

    return {
      message:
        'Propiedades sincronizadas correctamente',
    };
  }

  async saveProperty(
    userId: string,
    item: any,
  ) {
    const easyBrokerUpdatedAt = new Date(
      item.updated_at,
    );

    const existingProperty =
      await this.propertyModel.findOne({
        easyBrokerId: item.public_id,
        userId: new Types.ObjectId(userId),
      });

    if (
      existingProperty &&
      existingProperty.updatedEasyBrokerAt &&
      existingProperty.updatedEasyBrokerAt >=
        easyBrokerUpdatedAt
    ) {
      return;
    }
    var folderId = '';
    if(existingProperty){
        folderId = existingProperty.folderId;
    }else{
        folderId = folderIdGenerator();
    }

    const downloadedPhotos: {path: string; thumbnail: string; isMain:boolean}[] = [];

      if (item.images?.length) {
        for (
          let index = 0;
          index < item.images.length;
          index++
        ) {
          const img = item.images[index];

          try {
            const optimized =
              await this.fileManager.downloadAndOptimizeImage(
                img.url,
                'properties/photos/' + userId + '/' + folderId,
              );

            downloadedPhotos.push({
              path: optimized.path,
              thumbnail: optimized.thumbnail,
              isMain: index === 0,
            });
          } catch (error) {
            console.error(
              'Error descargando imagen',
              img.url,
            );
          }
        }
      }

    const lotSize = Number(item.lot_size) || 0;
    const constructionSize =
    Number(item.construction_size) || 0;

    const market = this.buildMarket(item);
    const amenities = this.buildAmenities(item.features);
    const shouldUpdateSlug =
      !existingProperty?.propertySlug ||
      existingProperty?.market?.title !== market.title;
    const propertySlug = shouldUpdateSlug
      ? await this.ensureUniquePropertySlug(
          market.title || item.public_id || folderId,
          existingProperty?._id?.toString(),
        )
      : existingProperty.propertySlug;
    const address = item.location?.name || '';

    const propertyData = {
      userId: new Types.ObjectId(userId),

      ...(existingProperty? {}:{folderId} ),

      propertySlug,

      easyBrokerId: item.public_id,

      updatedEasyBrokerAt: easyBrokerUpdatedAt,

      status: 'draft',

      featured: {
        isActive: false,
      },

      exclusive: false,

      market,

      location: {
        department: this.detectarDepartamento(address || 'ninguno'),
        municipality: 'ninguno',
        zone: this.detectarZona(address),
        gatedCommunity: 'ninguno',
        address,

        coordinates: {
          type: 'Point',
          coordinates: [
            item.location?.longitude || 0,
            item.location?.latitude || 0,
          ],
        },

        waterRelation: 'None',
        floor: 0,
        view: 'Sin vista especial',
        streettype: 'None',
      },

      dimensions: {

        ...(lotSize > 0 && {
              landM2: lotSize,

              landV2: Number(
                (lotSize * 1.431).toFixed(2),
              ),
            }),
        ...(constructionSize > 0 && {
              constructionM2: constructionSize,
            }),
      },

      expenses: {
        stoveType: '',
        municipality: '',
        waterService: '',
        includes: [],
        iusi: {
          typepay: '',
          atday: false,
        },
      },

      structure: {
        constructionYear: 0,
        remodelYear: 0,
        levels: 0,
        ceilingHeight: 0,
        perimeterWall: false,
      },

      layout: {
        totalRooms:
          item.bedrooms || 0,

        bedrooms:
          item.bedrooms || 0,

        bathrooms:
          item.bathrooms || 0,

        halfBathrooms:
          item.half_bathrooms || 0,

        serviceRoom: '',

        deck: false,

        parkingSpots:
          item.parking_spaces || 0,

        furnished: false,

        floors: 0,

        driveaway: false,

        laundry: '',

        study: false,

        familyroom: '',
      },

      media: {
        description: '',

        photos:
          downloadedPhotos,

        videos: [],

        tour360: [],
      },

      amenities,

      extraFeatures: {},

      visitCounter: 0,

      clickCounter: 0,
    };
    await this.propertyModel.findOneAndUpdate(
      {
        easyBrokerId:
          item.public_id,

        userId:
          new Types.ObjectId(userId),
      },
      propertyData,
      {
        upsert: true,
        new: true,
      },
    );
  }
  async getPropertyDetail(
    publicId: string,
    apiKey: string,
  ) {
    const response = await axios.get(
      `${this.API_URL}/properties/${publicId}`,
      {
        headers: {
          'X-Authorization': apiKey,
        },
      },
    );

    return response.data;
  }
  private buildMarket(item: any) {
      const operations = item.operations || [];

      // prioridad: sale -> rental
      let selectedOperations = operations.filter(
        (op) => op.type === 'sale',
      );

      if (selectedOperations.length === 0) {
        selectedOperations = operations.filter(
          (op) => op.type === 'rental',
        );
      }

      let price = 0;
      let priceUSD = 0;
      let typeProc = '';
      for (const operation of selectedOperations) {
        const amount = Number(operation.amount) || 0;

        if (operation.currency === 'GTQ') {
          price = amount;
        }

        if (operation.currency === 'USD') {
          priceUSD = amount;
        }

        if(operation.type == 'rental'){
            typeProc = 'Alquiler';
        }else if(operation.type == 'sale'){
            typeProc = 'Venta';
        }
        
      }

      // calcular tasa de cambio
      let exchangeRate = 1;

      if (price > 0 && priceUSD > 0) {
        exchangeRate = Math.ceil(Number(
          (price / priceUSD).toFixed(2),
        ));
      }

      if(priceUSD == 0 && price > 0){
          priceUSD = Math.ceil(Number((price / 7.8).toFixed(2),));
          exchangeRate = 7.8;
      }

      if(priceUSD > 0 && price == 0){
          price = Math.ceil(Number((priceUSD * 7.8).toFixed(2),));
          exchangeRate = 7.8;
      }

      let propertyType = item.property_type || '';
      propertyType = /\bcasa\b/i.test(propertyType) ? 'Casa' : propertyType;

      return {
        title: item.title || '',

        description: item.description || '',

        price,

        priceUSD,

        exchangeRate,

        operationType:
          selectedOperations?.[0]?.type || '',

        propertyType: propertyType,

        type: propertyType,

        mode: typeProc || '',

        showprice: true,
      };
  }
  private buildAmenities(features: any[] = []) {
    const amenities: Record<string, boolean> = {};

    for (const feature of features) {
      if (!feature.name) continue;

      const key = this.normalizeAmenityKey(feature.name);

      amenities[key] = true;
    }

    return amenities;
  }
  private normalizeAmenityKey(value: string): string {
    return value
      .normalize('NFD') // elimina acentos
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();
  }
  private detectarDepartamento(direccion: string): string | null {
        
    const departamentos: Record<string, string[]> = {
      "Alta Verapaz": ["alta verapaz"],
      "Baja Verapaz": ["baja verapaz"],
      "Chimaltenango": ["chimaltenango"],
      "Chiquimula": ["chiquimula"],
      "El Progreso": ["el progreso"],
      "Escuintla": ["escuintla"],
      "Guatemala": ["guatemala", "guate", "zona"],
      "Huehuetenango": ["huehuetenango", "huehue"],
      "Izabal": ["izabal", "puerto barrios"],
      "Jalapa": ["jalapa"],
      "Jutiapa": ["jutiapa"],
      "Petén": ["peten", "petén", "flores"],
      "Quetzaltenango": ["quetzaltenango", "xela"],
      "Quiché": ["quiche", "quiché"],
      "Retalhuleu": ["retalhuleu", "reu"],
      "Sacatepéquez": ["sacatepequez", "sacatepéquez", "antigua"],
      "San Marcos": ["san marcos"],
      "Santa Rosa": ["santa rosa"],
      "Sololá": ["solola", "sololá", "panajachel"],
      "Suchitepéquez": ["suchitepequez", "suchitepéquez"],
      "Totonicapán": ["totonicapan", "totonicapán"],
      "Zacapa": ["zacapa"],
    };

    // Normalizar texto
    const texto = direccion
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    // Buscar coincidencias
    for (const [departamento, aliases] of Object.entries(departamentos)) {

      for (const alias of aliases) {

        const aliasNormalizado = alias
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

        if (texto.includes(aliasNormalizado)) {
          return departamento;
        }
      }
    }

    return 'ninguno';
  }
  private detectarZona(direccion: string): string {
    const texto = String(direccion || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    const match = texto.match(/\b(?:zona|zone|z\.?)\s*#?\s*(\d{1,2})\b/);
    if (!match) return 'ninguno';

    const zoneNumber = Number(match[1]);
    if (!Number.isInteger(zoneNumber) || zoneNumber < 1 || zoneNumber > 25) {
      return 'ninguno';
    }

    return `Zona ${zoneNumber}`;
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
  async restorePropertyImages(userId: string) {
      const user = await this.userModel.findById(userId);

      if (!user) {
        throw new BadRequestException(
          'Usuario no encontrado',
        );
      }

      if (!user.easyBrokerApiKey) {
        throw new BadRequestException(
          'El usuario no tiene API KEY de EasyBroker',
        );
      }

      // buscar propiedades sincronizadas con easybroker
      const properties = await this.propertyModel.find({
        userId: new Types.ObjectId(userId),
        easyBrokerId: {
          $exists: true,
          $ne: null,
        },
      });

      let restored = 0;
      let failed = 0;

      for (const property of properties) {

        // validar easyBrokerId
        if (!property.easyBrokerId) {
          console.log(
            `Propiedad ${property._id} sin easyBrokerId`,
          );

          continue;
        }

        // validar folderId
        if (!property.folderId) {
          console.log(
            `Propiedad ${property._id} sin folderId`,
          );

          continue;
        }

        try {
          console.log(
            `Restaurando imágenes de ${property.easyBrokerId}`,
          );

          // delay para evitar rate limit
          await this.sleep(500);

          // obtener detalle actualizado desde easybroker
          const detail =
            await this.getPropertyDetail(
              property.easyBrokerId,
              user.easyBrokerApiKey,
            );

          // eliminar carpeta anterior
          try {
            await this.fileManager.deleteFolder(
              `properties/photos/${userId}/${property.folderId}`,
            );

            console.log(
              `Carpeta eliminada: ${property.folderId}`,
            );
          } catch (error) {
            console.log(
              'No se pudo eliminar carpeta o no existía',
            );
          }

          const downloadedPhotos: {
            path: string;
            thumbnail: string;
            isMain: boolean;
          }[] = [];

          // descargar imágenes nuevamente
          if (detail.images?.length) {

            for (
              let index = 0;
              index < detail.images.length;
              index++
            ) {

              const img = detail.images[index];

              // validar url
              if (!img.url) {
                continue;
              }

              try {

              
                const optimized =
                  await this.fileManager.downloadAndOptimizeImage(
                    img.url,
                    `properties/photos/${userId}/${property.folderId}`,
                  );

                downloadedPhotos.push({
                  path: optimized.path,
                  thumbnail: optimized.thumbnail,
                  isMain: index === 0,
                });

                console.log(
                  `Imagen descargada: ${img.url}`,
                );

              } catch (error) {

                console.error(
                  `Error descargando imagen ${img.url}`,
                  error,
                );
              }
            }
          }

          // actualizar SOLO las fotos
          await this.propertyModel.updateOne(
            {
              _id: property._id,
            },
            {
              $set: {
                'media.photos':
                  downloadedPhotos,
              },
            },
          );

          restored++;

          console.log(
            `Imágenes restauradas correctamente para ${property.easyBrokerId}`,
          );

        } catch (error) {

          failed++;

          console.error(
            `Error restaurando propiedad ${property.easyBrokerId}`,
            error,
          );
        }
      }

      return {
        message:
          'Restauración de imágenes completada',
        total: properties.length,
        restored,
        failed,
      };
  }
  async optimizePropertyImages(userId: string) {

      const properties = await this.propertyModel.find({
        userId: new Types.ObjectId(userId),
      });

      let optimized = 0;
      let failed = 0;

      for (const property of properties) {

        try {

          if (!property.media?.photos?.length) {
            continue;
          }

          const updatedPhotos: {
            path: string;
            thumbnail: string;
            isMain: boolean;
          }[] = [];

          for (const photo of property.media.photos) {

            try {

              if (!photo.path) {
                continue;
              }

              const result =
                await this.fileManager.optimizeImage(
                  String(photo.path),
                );

              updatedPhotos.push({
                path: result.path,
                thumbnail:
                  result.thumbnail,
                isMain:
                  Boolean(photo.isMain),
              });

              optimized++;

            } catch (error) {

              failed++;

              console.error(
                'Error optimizando imagen',
                error,
              );
            }
          }

          // actualizar solo fotos
          await this.propertyModel.updateOne(
            {
              _id: property._id,
            },
            {
              $set: {
                'media.photos':
                  updatedPhotos,
              },
            },
          );

        } catch (error) {

          failed++;

          console.error(
            `Error propiedad ${property._id}`,
            error,
          );
        }
      }

      return {
        message:
          'Optimización completada',
        optimized,
        failed,
        total: properties.length,
      };
  }
  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

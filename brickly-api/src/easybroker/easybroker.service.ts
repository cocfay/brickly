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
    const municipioDetected = this.detectarMunicipio(address);
    const department = municipioDetected.department || this.detectarDepartamento(address);
    const municipality = municipioDetected.municipality || 'ninguno';
    const zone = this.detectarZona(address);

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
        department,
        municipality,
        zone,
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
  private detectarMunicipio(direccion: string): { department: string | null; municipality: string | null } {
    const municipios: { aliases: string[]; department: string; municipality: string }[] = [
      // --- Guatemala ---
      { aliases: ["ciudad de guatemala", "guatemala city", "cd. de guatemala"], department: "Guatemala", municipality: "Ciudad de Guatemala" },
      { aliases: ["mixco"], department: "Guatemala", municipality: "Mixco" },
      { aliases: ["villa nueva"], department: "Guatemala", municipality: "Villa Nueva" },
      { aliases: ["san miguel petapa", "petapa"], department: "Guatemala", municipality: "San Miguel Petapa" },
      { aliases: ["villa canales"], department: "Guatemala", municipality: "Villa Canales" },
      { aliases: ["amatitlan", "amatitlán"], department: "Guatemala", municipality: "Amatitlán" },
      { aliases: ["santa catarina pinula", "santa catarina"], department: "Guatemala", municipality: "Santa Catarina Pinula" },
      { aliases: ["san jose pinula", "san josé pinula"], department: "Guatemala", municipality: "San José Pinula" },
      { aliases: ["san juan sacatepequez", "san juan sacatepéquez"], department: "Guatemala", municipality: "San Juan Sacatepéquez" },
      { aliases: ["san pedro sacatepequez", "san pedro sacatepéquez"], department: "Guatemala", municipality: "San Pedro Sacatepéquez" },
      { aliases: ["chinautla"], department: "Guatemala", municipality: "Chinautla" },
      { aliases: ["palencia"], department: "Guatemala", municipality: "Palencia" },
      { aliases: ["fraijanes"], department: "Guatemala", municipality: "Fraijanes" },
      // --- Sacatepéquez ---
      { aliases: ["antigua guatemala", "la antigua", "antigua"], department: "Sacatepéquez", municipality: "Antigua Guatemala" },
      { aliases: ["ciudad vieja"], department: "Sacatepéquez", municipality: "Ciudad Vieja" },
      { aliases: ["jocotenango"], department: "Sacatepéquez", municipality: "Jocotenango" },
      { aliases: ["pastores"], department: "Sacatepéquez", municipality: "Pastores" },
      { aliases: ["san antonio aguas calientes", "san antonio"], department: "Sacatepéquez", municipality: "San Antonio Aguas Calientes" },
      { aliases: ["santo domingo xenacoj", "xenacoj"], department: "Sacatepéquez", municipality: "Santo Domingo Xenacoj" },
      { aliases: ["sumpango"], department: "Sacatepéquez", municipality: "Sumpango" },
      { aliases: ["santiago sacatepequez", "santiago sacatepéquez"], department: "Sacatepéquez", municipality: "Santiago Sacatepéquez" },
      { aliases: ["san lucas sacatepequez", "san lucas sacatepéquez"], department: "Sacatepéquez", municipality: "San Lucas Sacatepéquez" },
      // --- Escuintla ---
      { aliases: ["escuintla"], department: "Escuintla", municipality: "Escuintla" },
      { aliases: ["puerto san jose", "puerto san josé", "san jose escuintla"], department: "Escuintla", municipality: "Puerto San José" },
      { aliases: ["santa lucia cotzumalguapa", "cotzumalguapa", "santa lucía cotzumalguapa"], department: "Escuintla", municipality: "Santa Lucía Cotzumalguapa" },
      { aliases: ["la democracia"], department: "Escuintla", municipality: "La Democracia" },
      { aliases: ["siquinala", "siquinalá"], department: "Escuintla", municipality: "Siquinalá" },
      { aliases: ["tiquisate"], department: "Escuintla", municipality: "Tiquisate" },
      { aliases: ["palin", "palín"], department: "Escuintla", municipality: "Palín" },
      // --- Quetzaltenango ---
      { aliases: ["quetzaltenango", "xela"], department: "Quetzaltenango", municipality: "Quetzaltenango" },
      { aliases: ["coatepeque"], department: "Quetzaltenango", municipality: "Coatepeque" },
      { aliases: ["colomba"], department: "Quetzaltenango", municipality: "Colomba" },
      { aliases: ["salcaja", "salcajá"], department: "Quetzaltenango", municipality: "Salcajá" },
      { aliases: ["ostuncalco"], department: "Quetzaltenango", municipality: "Ostuncalco" },
      { aliases: ["canton la floresta", "la floresta"], department: "Quetzaltenango", municipality: "Zona 3 Quetzaltenango" },
      // --- Chimaltenango ---
      { aliases: ["chimaltenango"], department: "Chimaltenango", municipality: "Chimaltenango" },
      { aliases: ["tepan", "tepán"], department: "Chimaltenango", municipality: "Tepán" },
      { aliases: ["patzun", "patzún"], department: "Chimaltenango", municipality: "Patzún" },
      { aliases: ["patzicia", "patzicía"], department: "Chimaltenango", municipality: "Patzicía" },
      { aliases: ["san andres itzapa", "san andrés itzapa", "itzapa"], department: "Chimaltenango", municipality: "San Andrés Itzapa" },
      { aliases: ["san juan comalapa", "comalapa"], department: "Chimaltenango", municipality: "San Juan Comalapa" },
      // --- Alta Verapaz ---
      { aliases: ["coban", "cobán"], department: "Alta Verapaz", municipality: "Cobán" },
      { aliases: ["san pedro carcha", "carcha", "carchá"], department: "Alta Verapaz", municipality: "San Pedro Carchá" },
      { aliases: ["chisec"], department: "Alta Verapaz", municipality: "Chisec" },
      { aliases: ["tactic"], department: "Alta Verapaz", municipality: "Tactic" },
      { aliases: ["panzos", "panzós"], department: "Alta Verapaz", municipality: "Panzós" },
      // --- Baja Verapaz ---
      { aliases: ["salamá"], department: "Baja Verapaz", municipality: "Salamá" },
      { aliases: ["rabinal"], department: "Baja Verapaz", municipality: "Rabinal" },
      { aliases: ["san miguel chicaj", "chicaj"], department: "Baja Verapaz", municipality: "San Miguel Chicaj" },
      // --- Huehuetenango ---
      { aliases: ["huehuetenango", "huehue"], department: "Huehuetenango", municipality: "Huehuetenango" },
      { aliases: ["chiantla"], department: "Huehuetenango", municipality: "Chiantla" },
      { aliases: ["jacaltenango"], department: "Huehuetenango", municipality: "Jacaltenango" },
      { aliases: ["barillas"], department: "Huehuetenango", municipality: "Barillas" },
      // --- San Marcos ---
      { aliases: ["san marcos", "san marcos guatemala"], department: "San Marcos", municipality: "San Marcos" },
      { aliases: ["malacatan", "malacatán"], department: "San Marcos", municipality: "Malacatán" },
      { aliases: ["san pedro", "san pedro san marcos"], department: "San Marcos", municipality: "San Pedro Sacatepéquez" },
      // --- Petén ---
      { aliases: ["flores", "flores peten", "flores petén"], department: "Petén", municipality: "Flores" },
      { aliases: ["santa elena"], department: "Petén", municipality: "Santa Elena" },
      { aliases: ["san benito"], department: "Petén", municipality: "San Benito" },
      { aliases: ["sayaxche", "sayaxché"], department: "Petén", municipality: "Sayaxché" },
      // --- Izabal ---
      { aliases: ["puerto barrios"], department: "Izabal", municipality: "Puerto Barrios" },
      { aliases: ["livingston"], department: "Izabal", municipality: "Livingston" },
      { aliases: ["los amates"], department: "Izabal", municipality: "Los Amates" },
      { aliases: ["el estor"], department: "Izabal", municipality: "El Estor" },
      // --- Suchitepéquez ---
      { aliases: ["mazatenango"], department: "Suchitepéquez", municipality: "Mazatenango" },
      { aliases: ["santo tomas la union", "santo tomás la unión"], department: "Suchitepéquez", municipality: "Santo Tomás La Unión" },
      // --- Retalhuleu ---
      { aliases: ["retalhuleu", "reu"], department: "Retalhuleu", municipality: "Retalhuleu" },
      { aliases: ["champerico"], department: "Retalhuleu", municipality: "Champerico" },
      // --- Sololá ---
      { aliases: ["solola", "sololá"], department: "Sololá", municipality: "Sololá" },
      { aliases: ["panajachel"], department: "Sololá", municipality: "Panajachel" },
      { aliases: ["san pedro la laguna", "san pedro"], department: "Sololá", municipality: "San Pedro La Laguna" },
      // --- Totonicapán ---
      { aliases: ["totonicapan", "totonicapán"], department: "Totonicapán", municipality: "Totonicapán" },
      // --- Quiché ---
      { aliases: ["santa cruz del quiche", "santa cruz", "santa cruz del quiche", "quiche", "quiché"], department: "Quiché", municipality: "Santa Cruz del Quiché" },
      { aliases: ["chichicastenango", "chichi"], department: "Quiché", municipality: "Chichicastenango" },
      { aliases: ["joyabaj"], department: "Quiché", municipality: "Joyabaj" },
      // --- Jalapa ---
      { aliases: ["jalapa"], department: "Jalapa", municipality: "Jalapa" },
      // --- Jutiapa ---
      { aliases: ["jutiapa"], department: "Jutiapa", municipality: "Jutiapa" },
      { aliases: ["asuncion mita", "asunción mita", "mita"], department: "Jutiapa", municipality: "Asunción Mita" },
      // --- Santa Rosa ---
      { aliases: ["cuilapa"], department: "Santa Rosa", municipality: "Cuilapa" },
      { aliases: ["barberena"], department: "Santa Rosa", municipality: "Barberena" },
      { aliases: ["chiquimula"], department: "Chiquimula", municipality: "Chiquimula" },
      { aliases: ["esquipulas"], department: "Chiquimula", municipality: "Esquipulas" },
      // --- El Progreso ---
      { aliases: ["el progreso", "guastatoya"], department: "El Progreso", municipality: "Guastatoya" },
      // --- Zacapa ---
      { aliases: ["zacapa"], department: "Zacapa", municipality: "Zacapa" },
    ];

    const texto = String(direccion || '')
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, '');

    // Sort by longest alias first to avoid false positives (e.g. "san jose pinula" before "san jose")
    const sorted = [...municipios].sort((a, b) => {
      const aMax = Math.max(...a.aliases.map(x => x.length));
      const bMax = Math.max(...b.aliases.map(x => x.length));
      return bMax - aMax;
    });

    for (const entry of sorted) {
      for (const alias of entry.aliases) {
        const norm = alias
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, '');
        if (texto.includes(norm)) {
          return { department: entry.department, municipality: entry.municipality };
        }
      }
    }

    return { department: null, municipality: null };
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

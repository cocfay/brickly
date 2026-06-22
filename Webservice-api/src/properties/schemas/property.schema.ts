import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Market, MarketSchema } from './market.schema';
import { Expenses, ExpensesSchema } from './expenses.schema';
import { Dimensions, DimensionsSchema } from './dimensions.schema';
import { Structure, StructureSchema } from './structure.schema';
import { Layout, LayoutSchema } from './layout.schema';

@Schema({ timestamps: true })
export class Property {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({
  type: {
      isActive: Boolean,
      expiresAt: Date
    },
    default: { isActive: false }
  })
  featured!: {
    isActive: boolean;
    expiresAt: Date | null;
  };

  @Prop({ default: false })
  exclusive!: boolean;

  @Prop({ default: 'draft' })
  status!: string;

  @Prop({ type: [Types.ObjectId], ref: 'User' })
  agents!: Types.ObjectId[];

  @Prop({ type: MarketSchema })
  market!: Market;

  @Prop({ type: DimensionsSchema })
  dimensions!: Dimensions;

  @Prop({ type: ExpensesSchema })
  expenses!: Expenses;

  @Prop({ type: StructureSchema })
  structure!: Structure;

  @Prop({ type: LayoutSchema })
  layout!: Layout;

  @Prop({ type : {
                    department: String,
                    municipality: String,
                    zone: String,
                    gatedCommunity: String,
                    address: String,
                    coordinates: {
                      type: { type: String, default: 'Point' },
                      coordinates: [Number],
                    },
                    waterRelation: { type: String, default: 'None' },
                    floor: Number,
                    view: { type: String, default: 'Sin vista especial' },
                    streettype: { type: String, default: 'None' }
                  }
  })
  location!: Record<string, any>;

  // @Prop({ type : {
  //                   totalRooms: Number,
  //                   bedrooms: Number,
  //                   bathrooms: Number,
  //                   halfBathrooms: Number,
  //                   serviceRoom: String,
  //                   deck: Boolean,
  //                   parkingSpots: Number,
  //                   furnished: Boolean,
  //                   floors: Number,
  //                   driveaway: Boolean,
  //                   laundry: String,
  //                   study: Boolean,
  //                   familyroom: String

  //                 }
  // })
  // layout: {
  //           totalRooms: Number,
  //           bedrooms: Number,
  //           bathrooms: Number,
  //           halfBathrooms: Number,
  //           serviceRoom: String,
  //           deck: Boolean,
  //           parkingSpots: Number,
  //           furnished: Boolean,
  //           floors: Number,
  //           driveaway: Boolean,
  //           laundry: String,
  //           study: Boolean,
  //           familyroom: String
  //         };

  @Prop({ type :{
                  description: String,
                  link360: String,
                  photos: [{
                            path: String,
                            thumbnail: String,
                            isMain: Boolean,
                          }],
                  videos: [{
                            path: String,
                            isMain: Boolean,
                          }],
                  tour360: [{
                            path: String,
                            isMain: Boolean,
                          }],
                }
  })
  media!: {
    description: String,
    link360: String,
    photos: {
      path: String,
      thumbnail: String,
      isMain: Boolean,
    }[],
    videos: {
      path: String,
      isMain: Boolean,
    }[],
    tour360: {
      path: String,
      isMain: Boolean,
    }[],
  };

  @Prop({ type: Object })
  amenities!: Record<string, any>;

  @Prop({ type: Map, of: Object })
  extraFeatures!: Map<string, any>;

  @Prop({ type: Number, default: 0 })
  visitCounter!: number;

  @Prop({ type: Number, default: 0 })
  clickCounter!: number;

  @Prop()
  easyBrokerId?: string;

  @Prop()
  updatedEasyBrokerAt?: Date;

  @Prop({ unique: true, index: true })
  folderId!: string;

  @Prop({ type: Map, of: Object })
  reasonRejected!: Map<string, any>;

}

export const PropertySchema = SchemaFactory.createForClass(Property);

PropertySchema.index({
  userId: 1,
  agents: 1,
  status: 1,
});

PropertySchema.index({ 'location.coordinates': '2dsphere' });
PropertySchema.index({ 'market.price': 1 });
PropertySchema.index({ 'market.priceUSD': 1 });
PropertySchema.index({ 'featured.isActive': 1, 'featured.expiresAt': 1 });
PropertySchema.index({
  easyBrokerId: 1,
  userId: 1,
});
PropertySchema.index({ updatedEasyBrokerAt: -1 });
PropertySchema.index(
  { 
    'market.title': 'text', 
    'market.description': 'text',
    'location.department': 'text',
    'location.address': 'text'
  },
  {
    weights: {
      'market.title': 10, 
      'location.department': 5,
      'market.description': 1
    },
    name: 'BuscadorGlobalPropiedades'
  }
);
PropertySchema.index({ status: 1, userId: 1 });
PropertySchema.index({ status: 1, agents: 1 });
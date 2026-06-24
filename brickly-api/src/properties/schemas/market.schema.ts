import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
@Schema({ _id: false })
export class Market {
  @Prop()
  title: string;

  @Prop()
  description: string;

  @Prop()
  price: number;

  @Prop()
  priceUSD: number;

  @Prop()
  exchangeRate: number;

  @Prop()
  operationType: string; 

  @Prop()
  propertyType: string; 

  @Prop()
  pricePerM2: number;

  @Prop()
  priceM2USD: number;

  @Prop()
  type: String;

  @Prop()
  mode: String;

  @Prop()
  showprice: Boolean

  

}

export const MarketSchema = SchemaFactory.createForClass(Market);
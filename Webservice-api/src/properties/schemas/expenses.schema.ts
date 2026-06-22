import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
@Schema({ _id: false })
export class Expenses {
  @Prop()
  stoveType: string;

  @Prop()
  municipality: string;

  @Prop()
  waterService: string;

  @Prop({type: [String]})
  includes: string[];

  @Prop({ type: {typepay: String, atday: Boolean} })
  iusi: { typepay: string, atday: boolean };

  @Prop()
  maintenanceCost: number;
}

export const ExpensesSchema = SchemaFactory.createForClass(Expenses);
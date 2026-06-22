import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
@Schema({ _id: false })
export class Layout {
    @Prop()
    totalRooms: Number
    @Prop()
    bedrooms: Number
    @Prop()
    bathrooms: Number
    @Prop()
    halfBathrooms: Number
    @Prop()
    serviceRoom: String
    @Prop()
    deck: Boolean
    @Prop()
    parkingSpots: Number
    @Prop()
    furnished: Boolean
    @Prop()
    floors: Number
    @Prop()
    driveaway: Boolean
    @Prop()
    laundry: String
    @Prop()
    study: Boolean
    @Prop()
    familyroom: String

}

export const LayoutSchema = SchemaFactory.createForClass(Layout);
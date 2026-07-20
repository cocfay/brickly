import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Role } from '../auth/roles.enum';
import { Types } from 'mongoose';
import mongoose from 'mongoose';


@Schema()
export class User {
  @Prop({ unique: true, required: true })
  email!: string;

  @Prop()
  password!: string;

  @Prop()
  name!: string;

  @Prop({ type: String, required: false, unique: true, sparse: true })
  profileSlug?: string;

  @Prop()
  phone!: string;

  @Prop()
  avatar?: string;

  @Prop({ default: 0 })
  featured_user?: number;

  @Prop()
  featured_expire?: Date;

  @Prop()
  subscription_expire?: Date;

  @Prop({ default: false })
  accessBlocked?: boolean;

  @Prop()
  subscriptionPlan?: string; // PlanType adquirido (ej. AGENCIA_GOLD, BROKER_ANUAL, etc.)

  @Prop({ default: 'INACTIVE' })
  subscriptionStatus?: string; // ACTIVE | PAST_DUE | CANCELED | INACTIVE

  @Prop({ default: "free" })
  planUse?: string;

  @Prop({ type: [String], enum: Role })
  roles!: Role[];

  @Prop()
  googleId?: string;

  @Prop({ default: 'local' })
  provider!: string; // local | google

  @Prop({ type: Map, of: Object })
  personalInfo!: Map<string, any>;

  @Prop({ type: Map, of: Object })
  agentInfo!: Map<string, any>;

  @Prop({ type: [Types.ObjectId], ref: 'Property', default: [] })
  favorites!: Types.ObjectId[];

  @Prop({type: Boolean, default: true})
  isEnabled?: Boolean;

  @Prop({ default: null })
  customMaxProfiles?: number;

  @Prop({ type: mongoose.Types.ObjectId, ref: 'User', default: null })
  parentId!: mongoose.Types.ObjectId;

  @Prop()
  recurrenteCustomerId!: string

  @Prop({ default: 0 })
  ratingAverage!: number;

  @Prop({ default: 0 })
  ratingCount!: number;

  @Prop({ type: String, required: false })
  resetPasswordCode?: string;

  @Prop({ type: Date, required: false })
  resetPasswordExpires?: Date;

  @Prop({ type: Number, default: 0 })
  clickCounter!: number;

  @Prop({ type: Number, default: 0 })
  clickCounterWs!: number;

  @Prop({ default: false })
  easyBrokerApiKey?: string;

  @Prop()
  easyBrokerLastSync?: Date;

  @Prop({ default: false })
  easyBrokerEnabled?: boolean;

  @Prop({ default: false })
  verifyAccount?: boolean;
  
  @Prop({ type: String, required: false })
  VerifyAccountCode?: string;

  @Prop({ type: Date, required: false })
  verifyAccountCodeExpires?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ roles: 1, isEnabled: 1 });
UserSchema.index({ parentId: 1, isEnabled: 1, roles: 1 });

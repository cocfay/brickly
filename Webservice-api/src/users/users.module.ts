import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, UserSchema } from './user.schema';
import { Review, ReviewSchema } from '../reviews/schemas/review.schema';
import { Property, PropertySchema } from '../properties/schemas/property.schema';
import { Subscription, SubscriptionSchema } from '../subscriptions/schemas/subscription.schema';
import { ActivityLogsModule } from '../activitylogs/activitylogs.module';


@Module({
  imports: [
    ActivityLogsModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Review.name, schema: ReviewSchema },
      { name: Property.name, schema: PropertySchema },
      { name: Subscription.name, schema: SubscriptionSchema },
    ]),
    
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
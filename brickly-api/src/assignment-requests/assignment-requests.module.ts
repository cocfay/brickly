import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AssignmentRequestsController } from './assignment-requests.controller';
import { AssignmentRequestsService } from './assignment-requests.service';
import {
  AssignmentRequest,
  AssignmentRequestSchema,
} from './schemas/assignment-request.schema';
import { Property, PropertySchema } from '../properties/schemas/property.schema';
import { User, UserSchema } from '../users/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AssignmentRequest.name, schema: AssignmentRequestSchema },
      { name: Property.name, schema: PropertySchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [AssignmentRequestsController],
  providers: [AssignmentRequestsService],
})
export class AssignmentRequestsModule {}

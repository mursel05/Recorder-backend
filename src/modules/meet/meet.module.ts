import { Module } from '@nestjs/common';
import { MeetController } from './meet.controller';
import { MeetService } from './meet.service';
import { WorkerModule } from '../worker/worker.module';

@Module({
  imports: [WorkerModule],
  controllers: [MeetController],
  providers: [MeetService],
})
export class MeetModule {}
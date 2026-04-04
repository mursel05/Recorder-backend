import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BotService } from './bot.service';
import { WorkerService } from './worker.service';

@Module({
  imports: [ConfigModule],
  providers: [BotService, WorkerService],
  exports: [WorkerService], // MeetModule imports this to enqueue + query
})
export class WorkerModule {}
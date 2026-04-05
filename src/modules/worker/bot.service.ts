import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, Job } from 'bullmq';
import { MeetBot } from './bot';

@Injectable()
export class BotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BotService.name);
  private worker!: Worker;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.worker = new Worker(
      'recordings',
      async (job: Job) => {
        const bot = new MeetBot(job.data);

        await job.updateProgress({ status: 'joining' });
        await bot.join();

        await job.updateProgress({
          status: 'recording',
          startedAt: new Date().toISOString(),
        });
        bot.startRecording();

        await bot.waitForMeetingEnd();

        await job.updateProgress({ status: 'stopping' });
        return await bot.stop();
      },
      {
        connection: {
          host: this.config.get('redis.host'),
          port: this.config.get('redis.port'),
          password: this.config.get('redis.password'),
        },
        concurrency: parseInt(process.env.WORKER_CONCURRENCY ?? '3'),
      },
    );

    this.worker.on('active', (job) =>
      this.logger.log(`Job ${job.id} started — ${job.data.meetUrl}`),
    );
    this.worker.on('completed', (job) =>
      this.logger.log(`Job ${job.id} completed`),
    );
    this.worker.on('failed', (job, err) =>
      this.logger.error(`Job ${job?.id} failed: ${err.message}`),
    );
  }

  async onModuleDestroy() {
    await this.worker.close();
  }
}

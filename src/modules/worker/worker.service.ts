import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Job } from 'bullmq';

@Injectable()
export class WorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkerService.name);
  private queue: Queue;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.queue = new Queue('recordings', {
      connection: {
        host: this.config.get('redis.host'),
        port: this.config.get('redis.port'),
        password: this.config.get('redis.password'),
      },
    });
  }

  async onModuleDestroy() {
    await this.queue.close();
  }

  // Called by MeetService to enqueue
  async enqueue(data: {
    meetUrl: string;
    botName?: string;
    outputDir?: string;
    maxDurationMs?: number;
  }) {
    const job = await this.queue.add('record', data);
    this.logger.log(`Enqueued job ${job.id} for ${data.meetUrl}`);
    return job.id as string;
  }

  async getStatus(sessionId: string) {
    const job = await this.getJobOrThrow(sessionId);
    const state = await job.getState();
    const progress = job.progress as Record<string, string> | undefined;

    return {
      sessionId,
      status: this.mapStatus(state, progress),
      meetUrl: job.data.meetUrl,
      startedAt: progress?.startedAt,
      result: state === 'completed' ? job.returnvalue : undefined,
      error: state === 'failed' ? job.failedReason : undefined,
    };
  }

  async stop(sessionId: string) {
    const job = await this.getJobOrThrow(sessionId);
    const state = await job.getState();

    if (state === 'completed' || state === 'failed') {
      throw new ConflictException(`Session ${sessionId} is already ${state}.`);
    }
    if (state === 'waiting' || state === 'delayed') {
      await job.remove();
      return { message: 'Removed from queue before starting.' };
    }

    await job.discard();
    return { message: 'Stop signal sent.' };
  }

  async listAll() {
    const jobs = await this.queue.getJobs([
      'waiting',
      'active',
      'completed',
      'failed',
    ]);
    return Promise.all(
      jobs.map(async (job) => {
        const state = await job.getState();
        const progress = job.progress as Record<string, string> | undefined;
        return {
          sessionId: job.id as string,
          status: this.mapStatus(state, progress),
          meetUrl: job.data.meetUrl,
          startedAt: progress?.startedAt,
          error: state === 'failed' ? job.failedReason : undefined,
        };
      }),
    );
  }

  private async getJobOrThrow(sessionId: string): Promise<Job> {
    const job = await Job.fromId(this.queue, sessionId);
    if (!job) throw new NotFoundException(`Session ${sessionId} not found.`);
    return job;
  }

  private mapStatus(state: string, progress?: Record<string, string>) {
    if (state === 'completed') return 'stopped';
    if (state === 'failed') return 'error';
    if (state === 'waiting' || state === 'delayed') return 'waiting';
    return progress?.status ?? 'joining'; // active — use fine-grained progress
  }
}

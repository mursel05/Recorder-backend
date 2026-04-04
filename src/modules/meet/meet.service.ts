import { Injectable } from '@nestjs/common';
import { WorkerService } from '../worker/worker.service';
import { StartRecordingDto } from './dto/meet.dto';

@Injectable()
export class MeetService {
  constructor(private readonly workerService: WorkerService) {}

  async startRecording(dto: StartRecordingDto) {
    const sessionId = await this.workerService.enqueue({
      meetUrl: dto.meetUrl,
      botName: dto.botName,
    });
    return { sessionId };
  }

  getStatus(sessionId: string) {
    return this.workerService.getStatus(sessionId);
  }
  stopRecording(sessionId: string) {
    return this.workerService.stop(sessionId);
  }
  listSessions() {
    return this.workerService.listAll();
  }
}

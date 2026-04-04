import { IsString, IsUrl, IsOptional, IsInt, Min } from 'class-validator';

export class StartRecordingDto {
  @IsUrl()
  meetUrl: string;

  @IsOptional()
  @IsString()
  botName?: string;

  @IsOptional()
  @IsString()
  outputDir?: string;

  @IsOptional()
  @IsInt()
  @Min(1000)
  maxDurationMs?: number;
}

export class RecordingResultDto {
  sessionId: string;
  videoPath: string;
  durationMs: number;
  startedAt: string;
  endedAt: string;
}

export class SessionStatusDto {
  sessionId: string;
  status: 'joining' | 'recording' | 'stopped' | 'error';
  startedAt?: string;
  meetUrl: string;
  error?: string;
}

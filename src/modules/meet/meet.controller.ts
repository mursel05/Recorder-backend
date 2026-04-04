import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MeetService } from './meet.service';
import { StartRecordingDto } from './dto/meet.dto';
import { ApiBody } from '@nestjs/swagger';

@Controller('meet')
export class MeetController {
  constructor(private readonly meetService: MeetService) {}

  /**
   * POST /meet/record
   * Start a new recording session. Returns a sessionId immediately;
   * the bot joins and records in the background.
   */
  @Post('record')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiBody({ type: StartRecordingDto })
  startRecording(@Body() dto: StartRecordingDto) {
    return this.meetService.startRecording(dto);
  }

  /**
   * DELETE /meet/record/:sessionId
   * Stop an active recording early and get the result.
   */
  @Delete('record/:sessionId')
  stopRecording(@Param('sessionId') sessionId: string) {
    return this.meetService.stopRecording(sessionId);
  }

  /**
   * GET /meet/record/:sessionId/status
   * Poll the status of a session (joining | recording | stopped | error).
   */
  @Get('record/:sessionId/status')
  getStatus(@Param('sessionId') sessionId: string) {
    return this.meetService.getStatus(sessionId);
  }

  /**
   * GET /meet/sessions
   * List all sessions.
   */
  @Get('sessions')
  listSessions() {
    return this.meetService.listSessions();
  }
}

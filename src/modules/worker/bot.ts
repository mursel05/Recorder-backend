import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import * as puppeteer from 'puppeteer';
import { error } from 'console';

export interface MeetBotConfig {
  meetUrl: string;
  botName?: string;
  outputDir?: string;
  maxDurationMs?: number;
}

export interface RecordingResult {
  videoPath: string;
  durationMs: number;
  startedAt: Date;
  endedAt: Date;
}

export class MeetBot {
  private browser: puppeteer.Browser | null = null;
  private page: puppeteer.Page | null = null;
  private ffmpegProcess: ChildProcess | null = null;
  private startTime: Date | null = null;
  private videoPath: string | null = null;

  private readonly config: Required<MeetBotConfig>;

  constructor(config: MeetBotConfig) {
    this.config = {
      botName: 'Meeting Recorder',
      outputDir: './recordings',
      maxDurationMs: 3 * 60 * 60 * 1000,
      ...config,
    };

    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }
  }

  async join(): Promise<void> {
    console.log(`[MeetBot] Launching browser...`);

    this.browser = await puppeteer.launch({
      executablePath: process.env.CHROME_PATH,
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-notifications',
        '--disable-blink-features=AutomationControlled',
        '--incognito',
        '--start-maximized',
        '--window-size=1280,720',
        '--window-position=0,0',
        '--kiosk',
      ],
      defaultViewport: null,
    });

    this.page = await this.browser.newPage();

    console.log(`[MeetBot] Navigating to Meet URL...`);
    await this.page.goto(this.config.meetUrl, { waitUntil: 'networkidle2' });

    await this.handlePreJoinScreen();
    await this.waitUntilJoin();
    await this.makeFullScreen();
    await this.makeSpotlight();
    await this.removeBotCamera();
    await this.removeFooter();

    console.log(`[MeetBot] Successfully joined the meeting.`);
  }

  private async handlePreJoinScreen(): Promise<void> {
    try {
      const btn = await this.page!.waitForSelector('button[jsname="IbE0S"]', {
        timeout: 5000,
      });
      if (btn) {
        await btn.click();
        console.log(`[MeetBot] Clicked "Continue without microphone" button.`);
        await this.sleep(2000);
      }
    } catch (error) {
      console.log(error);
      throw new Error(
        'Failed to bypass pre-join screen. Please check the Meet URL and bot configuration.',
      );
    }

    try {
      const nameInput = await this.page!.waitForSelector(
        'input[jsname="YPqjbf"]',
        { timeout: 5000 },
      );
      if (nameInput) {
        await nameInput.click({ clickCount: 3 });
        await nameInput.type(this.config.botName);
        await this.sleep(2000);
      }
    } catch {
      throw new Error(
        'Failed to set bot name on pre-join screen. Please check the Meet URL and bot configuration.',
      );
    }

    try {
      const btn = await this.page!.waitForSelector('div[jsname="Qx7uuf"]', {
        timeout: 5000,
      });
      if (btn) {
        await btn.click();
        console.log(`[MeetBot] Clicked "Join now" button.`);
        await this.sleep(2000);
      }
    } catch {
      throw new Error(
        'Failed to click "Join now" button on pre-join screen. Please check the Meet URL and bot configuration.',
      );
    }
  }

  private async waitUntilJoin(): Promise<void> {
    try {
      await this.page!.waitForSelector('button[jsname="hNGZQc"]', {
        timeout: 600000,
      });
    } catch {
      throw new Error('Timed out waiting to join the meeting.');
    }
  }

  private async makeFullScreen(): Promise<void> {
    try {
      const moreBtn = await this.page!.waitForSelector(
        'button[jsname="NakZHc"]',
        { timeout: 5000 },
      );
      await moreBtn!.click();
      await this.sleep(500);
      await this.page!.evaluate(() => {
        const items = document.querySelectorAll("li[role='menuitem']");
        for (const item of items) {
          if (item.textContent?.includes('Full screen')) {
            (item as HTMLElement).click();
            break;
          }
        }
      });
      console.log('[MeetBot] Entered fullscreen.');
      await this.sleep(1000);
    } catch {
      throw new Error('Failed to enter fullscreen mode.');
    }
  }

  private async makeSpotlight(): Promise<void> {
    try {
      const moreBtn = await this.page!.waitForSelector(
        'button[jsname="NakZHc"]',
        { timeout: 5000 },
      );
      await moreBtn!.click();
      await this.sleep(500);
      await this.page!.evaluate(() => {
        const items = document.querySelectorAll("li[role='menuitem']");
        for (const item of items) {
          if (item.textContent?.includes('Adjust view')) {
            (item as HTMLElement).click();
            break;
          }
        }
      });
      await this.sleep(1000);
      await this.page!.evaluate(() => {
        const labels = document.querySelectorAll('label.DxvcU');
        for (const label of labels) {
          if (label.textContent?.includes('Spotlight')) {
            (label as HTMLElement).click();
            break;
          }
        }
      });
      await this.page!.evaluate(() => {
        const buttons = document.querySelectorAll(
          'button.VfPpkd-Bz112c-LgbsSe',
        );
        for (const button of buttons) {
          if (button.getAttribute('aria-label') === 'Close') {
            (button as HTMLElement).click();
            break;
          }
        }
      });
      console.log('[MeetBot] Entered spotlight mode.');
      await this.sleep(1000);
    } catch {
      throw new Error('Failed to enter spotlight mode.');
    }
  }

  private async removeBotCamera(): Promise<void> {
    try {
      const screen = await this.page!.waitForSelector('div[jsname="Qiayqc"]', {
        timeout: 5000,
      });
      await this.page!.evaluate((el) => el?.remove(), screen);
      console.log('[MeetBot] Removed bot camera.');
      await this.sleep(1000);
    } catch {
      throw new Error('Failed to remove bot camera.');
    }
  }

  private async removeFooter(): Promise<void> {
    try {
      await this.page!.waitForSelector('#browser-extension-end-buttons', {
        timeout: 5000,
      });
      await this.page!.evaluate(() => {
        const anchor = document.querySelector('#browser-extension-end-buttons');
        if (!anchor) return;
        let el = anchor as HTMLElement;
        while (el && el !== document.body) {
          const style = window.getComputedStyle(el);
          if (style.position === 'fixed' || el.dataset.side === '3') {
            el.remove();
            return;
          }
          el = el.parentElement as HTMLElement;
        }
      });
      await this.sleep(1000);
      console.log('[MeetBot] Removed footer.');
    } catch {
      throw new Error('Failed to remove footer.');
    }
  }

  startRecording(): void {
    this.startTime = new Date();
    const timestamp = Date.now();

    this.videoPath = path.join(
      this.config.outputDir,
      `recording_${timestamp}.mp4`,
    );

    const display = process.env.DISPLAY || ':99';
    const pulseSource = process.env.PULSE_SOURCE || 'virtual_sink.monitor';

    this.ffmpegProcess = spawn('ffmpeg', [
      '-y',
      '-draw_mouse',
      '0',
      '-f',
      'x11grab',
      '-r',
      '30',
      '-s',
      '1280x720',
      '-i',
      `${display}.0`,
      '-f',
      'pulse',
      '-i',
      pulseSource,
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-ar',
      '44100',
      '-movflags',
      '+faststart',
      this.videoPath,
    ]);

    this.ffmpegProcess.stdout?.on('data', (data) => process.stdout.write(data));
    this.ffmpegProcess.stderr?.on('data', (data) => process.stderr.write(data));
    this.ffmpegProcess.on('close', (code) =>
      console.log(`[MeetBot] FFmpeg exited with code ${code}`),
    );

    console.log(`[MeetBot] Recording to: ${this.videoPath}`);
  }

  async waitForMeetingEnd(): Promise<void> {
    const maxDuration = this.config.maxDurationMs;
    const checkInterval = 10000;
    const startTime = Date.now();

    console.log('[MeetBot] Monitoring meeting status...');
    await this.sleep(5000);

    while (true) {
      if (Date.now() - startTime >= maxDuration) {
        console.log('[MeetBot] Max duration reached, leaving.');
        break;
      }

      try {
        const participantCountEl = await this.page!.$(
          'span[data-avatar-count]',
        );
        const participantCount = participantCountEl
          ? parseInt(
              await participantCountEl.evaluate(
                (el) => el.getAttribute('data-avatar-count') ?? '1',
              ),
            )
          : 1;

        if (participantCount === 1) {
          console.log('[MeetBot] No other participants, meeting ended.');
          break;
        }
      } catch {
        console.log(
          '[MeetBot] Error checking participants, assuming meeting ended.',
        );
        break;
      }

      await this.sleep(checkInterval);
    }
  }

  async stop(): Promise<RecordingResult> {
    console.log('[MeetBot] Stopping...');

    const endTime = new Date();
    const durationMs =
      endTime.getTime() - (this.startTime?.getTime() ?? endTime.getTime());

    if (this.ffmpegProcess) {
      this.ffmpegProcess.stdin?.write('q');
      await this.sleep(3000);
      this.ffmpegProcess.kill('SIGTERM');
    }

    if (this.browser) {
      await this.browser.close();
    }

    return {
      videoPath: this.videoPath!,
      durationMs,
      startedAt: this.startTime ?? endTime,
      endedAt: endTime,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((res) => setTimeout(res, ms));
  }
}

const puppeteer = require("puppeteer");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

class MeetBot {
  constructor(config) {
    this.browser = null;
    this.page = null;
    this.ffmpegProcess = null;
    this.startTime = null;

    this.config = {
      botName: "Meeting Recorder",
      outputDir: "./recordings",
      maxDurationMs: 3 * 60 * 60 * 1000,
      ...config,
    };

    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }
  }

  async join() {
    console.log(`[MeetBot] Launching browser...`);

    this.browser = await puppeteer.launch({
      headless: false,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-notifications",
        "--start-maximized",
        "--disable-blink-features=AutomationControlled",
        "--incognito",
      ],
    });

    this.page = await this.browser.newPage();
    await this.page.evaluateOnNewDocument((name) => {
      localStorage.setItem("botName", name);
    }, this.config.botName);

    console.log(`[MeetBot] Navigating to Meet URL...`);
    await this.page.goto(this.config.meetUrl, { waitUntil: "networkidle2" });

    await this.handlePreJoinScreen();
    await this.waitUntilJoin();

    console.log(`[MeetBot] Successfully joined the meeting.`);
  }

  async handlePreJoinScreen() {
    const page = this.page;

    try {
      const btn = await page.waitForSelector('button[jsname="IbE0S"]', {
        timeout: 5000,
      });
      if (btn) {
        await btn.click();
        console.log(`[MeetBot] Clicked "Continue without microphone" button.`);
        await new Promise((res) => setTimeout(res, 2000));
      }
    } catch {}

    try {
      const nameInput = await page.waitForSelector('input[jsname="YPqjbf"]', {
        timeout: 5000,
      });
      if (nameInput) {
        await nameInput.click({ clickCount: 3 });
        await nameInput.type(this.config.botName);
        await new Promise((res) => setTimeout(res, 2000));
      }
    } catch {}

    try {
      const btn = await page.waitForSelector('div[jsname="Qx7uuf"]', {
        timeout: 5000,
      });
      if (btn) {
        await btn.click();
        console.log(`[MeetBot] Clicked "Join now" button after entering name.`);
        await new Promise((res) => setTimeout(res, 2000));
      }
    } catch {}
  }

  async waitUntilJoin() {
    const page = this.page;

    try {
      await page.waitForSelector('button[jsname="hNGZQc"]', {
        timeout: 600000,
      });
    } catch {
      throw new Error("Timed out waiting to join the meeting.");
    }
  }

  startRecording() {
    const timestamp = Date.now();
    const videoPath = path.join(
      this.config.outputDir,
      `recording_${timestamp}.mp4`,
    );
    const display = process.env.DISPLAY || ":99";

    console.log(`[MeetBot] Starting FFmpeg recording on display ${display}...`);
    this.startTime = new Date();

    this.ffmpegProcess = spawn("ffmpeg", [
      "-y",
      "-f",
      "x11grab",
      "-r",
      "30",
      "-s",
      "1280x720",
      "-i",
      `${display}.0`,
      "-f",
      "pulse",
      "-i",
      "default",
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      videoPath,
    ]);

    this.ffmpegProcess.stdout?.on("data", (data) => process.stdout.write(data));
    this.ffmpegProcess.stderr?.on("data", (data) => process.stderr.write(data));
    this.ffmpegProcess.on("close", (code) => {
      console.log(`[MeetBot] FFmpeg exited with code ${code}`);
    });

    console.log(`[MeetBot] Recording to: ${videoPath}`);
  }

  async waitForMeetingEnd() {
    const page = this.page;
    const maxDuration = this.config.maxDurationMs;
    const checkInterval = 10000;
    const startTime = Date.now();

    console.log("[MeetBot] Monitoring meeting status...");

    await new Promise((res) => setTimeout(res, 5000));
    while (true) {
      const elapsed = Date.now() - startTime;
      if (elapsed >= maxDuration) {
        console.log("[MeetBot] Max duration reached, leaving.");
        break;
      }

      try {
        const participantCountEl = await page.$("span[data-avatar-count]");

        const participantCount = participantCountEl
          ? parseInt(
              await participantCountEl.evaluate((el) =>
                el.getAttribute("data-avatar-count"),
              ),
            )
          : 1;

        if (participantCount === 1) {
          console.log(
            "[MeetBot] No participants found, assuming meeting ended.",
          );
          break;
        }
      } catch (err) {
        console.log(
          "[MeetBot] Error checking participant count, assuming meeting ended.",
        );
        break;
      }

      await new Promise((res) => setTimeout(res, checkInterval));
    }
  }

  async stop() {
    console.log("[MeetBot] Stopping recording...");

    const endTime = new Date();
    const durationMs =
      endTime.getTime() - (this.startTime?.getTime() ?? endTime.getTime());

    if (this.ffmpegProcess) {
      this.ffmpegProcess.stdin?.write("q");
      await new Promise((res) => setTimeout(res, 2000));
      this.ffmpegProcess.kill("SIGTERM");
    }

    if (this.browser) {
      await this.browser.close();
    }

    const timestamp = Math.floor(
      (this.startTime?.getTime() ?? Date.now()) / 1000,
    );
    const videoPath = path.join(
      this.config.outputDir,
      `recording_${timestamp}.mp4`,
    );
    const audioPath = path.join(
      this.config.outputDir,
      `recording_${timestamp}.aac`,
    );

    return {
      videoPath,
      audioPath,
      durationMs,
      startedAt: this.startTime ?? endTime,
      endedAt: endTime,
    };
  }
}

module.exports = { MeetBot };

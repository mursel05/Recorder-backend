const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

class MeetBot {
  constructor(config) {
    this.browser = null;
    this.page = null;
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
        "--disable-blink-features=AutomationControlled",
        "--incognito",
        "--start-maximized",
        "--window-size=1280,720",
        "--window-position=0,0",
        "--kiosk",
      ],
      defaultViewport: null,
    });

    this.page = await this.browser.newPage();

    console.log(`[MeetBot] Navigating to Meet URL...`);
    await this.page.goto(this.config.meetUrl, { waitUntil: "networkidle2" });

    await this.handlePreJoinScreen();
    await this.waitUntilJoin();
    await this.makeFullScreen();
    await this.makeSpotlight();
    await this.removeBotCamera();
    await this.removeFooter();
    console.log(`[MeetBot] Successfully joined the meeting.`);
  }

  async handlePreJoinScreen() {
    try {
      const btn = await this.page.waitForSelector('button[jsname="IbE0S"]', {
        timeout: 5000,
      });
      if (btn) {
        await btn.click();
        console.log(`[MeetBot] Clicked "Continue without microphone" button.`);
        await new Promise((res) => setTimeout(res, 2000));
      }
    } catch {}

    try {
      const nameInput = await this.page.waitForSelector(
        'input[jsname="YPqjbf"]',
        {
          timeout: 5000,
        },
      );
      if (nameInput) {
        await nameInput.click({ clickCount: 3 });
        await nameInput.type(this.config.botName);
        await new Promise((res) => setTimeout(res, 2000));
      }
    } catch {}

    try {
      const btn = await this.page.waitForSelector('div[jsname="Qx7uuf"]', {
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
    try {
      await this.page.waitForSelector('button[jsname="hNGZQc"]', {
        timeout: 600000,
      });
    } catch {
      throw new Error("Timed out waiting to join the meeting.");
    }
  }

  async makeFullScreen() {
    try {
      const moreBtn = await this.page.waitForSelector(
        'button[jsname="NakZHc"]',
        {
          timeout: 5000,
        },
      );
      await moreBtn.click();
      await new Promise((res) => setTimeout(res, 500));
      await this.page.evaluate(() => {
        const items = document.querySelectorAll("li[role='menuitem']");
        for (const item of items) {
          if (item.textContent.includes("Full screen")) {
            item.click();
            break;
          }
        }
      });
      console.log("[MeetBot] Clicked fullscreen");
      await new Promise((res) => setTimeout(res, 1000));
    } catch {
      throw new Error("Failed to enter fullscreen mode.");
    }
  }

  async makeSpotlight() {
    try {
      const moreBtn = await this.page.waitForSelector(
        'button[jsname="NakZHc"]',
        {
          timeout: 5000,
        },
      );
      await moreBtn.click();
      await new Promise((res) => setTimeout(res, 500));
      await this.page.evaluate(() => {
        const items = document.querySelectorAll("li[role='menuitem']");
        for (const item of items) {
          if (item.textContent.includes("Adjust view")) {
            item.click();
            break;
          }
        }
      });
      await new Promise((res) => setTimeout(res, 1000));
      await this.page.evaluate(() => {
        const labels = document.querySelectorAll("label.DxvcU");
        for (const label of labels) {
          if (label.textContent.includes("Spotlight")) {
            label.click();
            break;
          }
        }
      });
      await this.page.evaluate(() => {
        const buttons = document.querySelectorAll(
          "button.VfPpkd-Bz112c-LgbsSe",
        );
        for (const button of buttons) {
          if (button.getAttribute("aria-label") === "Close") {
            button.click();
            break;
          }
        }
      });
      console.log("[MeetBot] Clicked spotlight mode");
      await new Promise((res) => setTimeout(res, 1000));
    } catch {
      throw new Error("Failed to enter spotlight mode.");
    }
  }

  async removeBotCamera() {
    try {
      const screen = await this.page.waitForSelector('div[jsname="Qiayqc"]', {
        timeout: 5000,
      });
      await this.page.evaluate((btn) => btn.remove(), screen);
      console.log("[MeetBot] Removed bot camera from recording.");
      await new Promise((res) => setTimeout(res, 1000));
    } catch {
      throw new Error("Failed to remove bot camera.");
    }
  }

  async removeFooter() {
    try {
      await this.page.waitForSelector("#browser-extension-end-buttons", {
        timeout: 5000,
      });
      await this.page.evaluate(() => {
        const anchor = document.querySelector("#browser-extension-end-buttons");
        if (!anchor) return;
        // walk up until we find the fixed-position footer root
        let el = anchor;
        while (el && el !== document.body) {
          const style = window.getComputedStyle(el);
          if (style.position === "fixed" || el.dataset.side === "3") {
            el.remove();
            return;
          }
          el = el.parentElement;
        }
      });
      await new Promise((res) => setTimeout(res, 1000));
      console.log("[MeetBot] Removed footer from recording.");
    } catch (error) {
      console.log(error);
      throw new Error("Failed to remove footer.");
    }
  }

  startRecording() {
    const timestamp = Date.now();
    const videoPath = path.join(
      this.config.outputDir,
      `recording_${timestamp}.mp4`,
    );
    this.startTime = new Date();
    const display = process.env.DISPLAY || ":99";

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

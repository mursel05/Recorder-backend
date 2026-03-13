const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

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
        "--start-maximized",
        "--disable-blink-features=AutomationControlled",
        "--incognito",
        "--autoplay-policy=no-user-gesture-required",
        "--enable-usermedia-screen-capturing",
        "--allow-http-screen-capture",
      ],
    });

    this.page = await this.browser.newPage();
    // Forward browser console to terminal
    this.page.on("console", (msg) => {
      console.log(`[Browser] ${msg.text()}`);
    });
    // in evaluateOnNewDocument - just store peer connections
    await this.page.evaluateOnNewDocument(() => {
      window._peerConnections = [];
      const orig = window.RTCPeerConnection;
      window.RTCPeerConnection = function (...args) {
        const pc = new orig(...args);
        window._peerConnections.push(pc);
        return pc;
      };
      window.RTCPeerConnection.prototype = orig.prototype;
    });

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

  async startRecording() {
    // Simulate user gesture to unlock media
    await this.page.mouse.click(640, 360);
    await this.page.keyboard.press("Space");
    await new Promise((res) => setTimeout(res, 1000));

    // Click the Meet video area specifically
    try {
      const videoEl = await this.page.$("video");
      if (videoEl) {
        await videoEl.click();
        console.log("[MeetBot] Clicked video element to unlock media");
      }
    } catch {}

    await new Promise((res) => setTimeout(res, 2000));

    // Now check if tracks unmuted
    const trackStates = await this.page.evaluate(() => {
      const states = [];
      (window._peerConnections || []).forEach((pc) => {
        pc.getReceivers().forEach((r) => {
          if (r.track)
            states.push({ kind: r.track.kind, muted: r.track.muted });
        });
      });
      return states;
    });
    console.log("[MeetBot] Track states after click:", trackStates);

    const timestamp = Date.now();
    this.videoPath = path.join(
      this.config.outputDir,
      `recording_${timestamp}.webm`,
    );
    this.startTime = new Date();

    await this.page.exposeFunction("saveChunk", (chunk) => {
      console.log(`[MeetBot] Saving chunk: ${chunk.length} bytes`); // ← add this
      const buffer = Buffer.from(chunk);
      fs.appendFileSync(this.videoPath, buffer);
    });
    await this.page.evaluate(() => {
      return new Promise((resolve, reject) => {
        let attempts = 0;

        const tryStart = () => {
          attempts++;

          // Get all live tracks from all peer connections
          // Get all live tracks from all peer connections
          const tracks = [];
          (window._peerConnections || []).forEach((pc) => {
            pc.getReceivers().forEach((receiver) => {
              if (receiver.track && receiver.track.readyState === "live") {
                receiver.track.enabled = true; // ← force enable
                tracks.push(receiver.track);
                console.log(
                  `[Recorder] Track: ${receiver.track.kind}, muted: ${receiver.track.muted}, enabled: ${receiver.track.enabled}`,
                );
              }
            });
          });

          console.log(
            `[Recorder] Attempt ${attempts}: ${tracks.length} live tracks, ${window._peerConnections?.length || 0} peer connections`,
          );

          if (attempts > 60) {
            reject(new Error("No tracks after 60s"));
            return;
          }

          if (tracks.length === 0) {
            setTimeout(tryStart, 1000);
            return;
          }

          const unmutedTracks = tracks.filter((t) => !t.muted);
          console.log(`[Recorder] Unmuted tracks: ${unmutedTracks.length}`);

          if (unmutedTracks.length === 0) {
            setTimeout(tryStart, 1000);
            return;
          }

          try {
            const stream = new MediaStream(unmutedTracks);
            const recorder = new MediaRecorder(stream, {
              mimeType: "video/webm;codecs=vp8,opus",
              videoBitsPerSecond: 2500000,
              audioBitsPerSecond: 128000,
            });

            recorder.ondataavailable = async (e) => {
              console.log(`[Recorder] chunk: ${e.data.size} bytes`);
              if (e.data.size > 0) {
                const buffer = await e.data.arrayBuffer();
                window.saveChunk(Array.from(new Uint8Array(buffer)));
              }
            };

            recorder.onerror = (e) => console.error("[Recorder] Error:", e);
            recorder.start(1000);
            window._meetRecorder = recorder;
            console.log(`[Recorder] ✅ Started with ${tracks.length} tracks`);
            resolve();
          } catch (err) {
            console.error("[Recorder] Failed:", err.message);
            reject(err);
          }
        };

        tryStart();
      });
    });

    console.log(`[MeetBot] Recording to: ${this.videoPath}`);
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

    if (this.page) {
      await this.page.evaluate(() => {
        if (window._meetRecorder) window._meetRecorder.stop();
      });
      await new Promise((res) => setTimeout(res, 2000));
    }

    if (this.browser) {
      await this.browser.close();
    }

    const timestamp = Math.floor(
      (this.startTime?.getTime() ?? Date.now()) / 1000,
    );
    const videoPath = path.join(
      this.config.outputDir,
      `recording_${timestamp}.webm`,
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

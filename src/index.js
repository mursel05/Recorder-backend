require("dotenv").config();
const { MeetBot } = require("./bot");

async function main() {
  const meetUrl = process.env.MEET_URL;
  if (!meetUrl) {
    console.error("Error: MEET_URL environment variable is required.");
    console.error(
      "Usage: MEET_URL=https://meet.google.com/xxx-yyyy-zzz ts-node src/index.ts",
    );
    process.exit(1);
  }

  const bot = new MeetBot({
    meetUrl,
    botName: process.env.BOT_NAME || "Meeting Recorder",
    outputDir: process.env.OUTPUT_DIR || "./recordings",
    maxDurationMs: parseInt(process.env.MAX_DURATION_MS || "10800000"),
  });

  process.on("SIGINT", async () => {
    console.log("\n[Main] Caught SIGINT, stopping bot...");
    const result = await bot.stop();
    console.log("[Main] Recording saved:", result);
    process.exit(0);
  });

  try {
    await bot.join();
    await bot.startRecording();
    await bot.waitForMeetingEnd();
    const result = await bot.stop();

    console.log("\n[Main] ✅ Recording complete:");
    console.log(`  Video:    ${result.videoPath}`);
    console.log(`  Audio:    ${result.audioPath}`);
    console.log(`  Duration: ${Math.round(result.durationMs / 1000)}s`);
    console.log(`  Started:  ${result.startedAt.toISOString()}`);
    console.log(`  Ended:    ${result.endedAt.toISOString()}`);
    await new Promise((res) => setTimeout(res, 200000));
  } catch (err) {
    console.error("[Main] Bot failed:", err);
    await bot.stop().catch(() => {});
    process.exit(1);
  }
}

main();

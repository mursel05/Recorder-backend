#!/bin/bash
set -e

echo "[start.sh] Starting Xvfb on :99..."
Xvfb :99 -screen 0 1280x720x24 &
export DISPLAY=:99
sleep 1

echo "[start.sh] Starting PulseAudio..."
pulseaudio --start --exit-idle-time=-1
pactl load-module module-null-sink sink_name=virtual_sink
pactl set-default-sink virtual_sink
pactl set-default-source virtual_sink.monitor
sleep 1

echo "[start.sh] Starting Meet bot..."
exec node src/index.js
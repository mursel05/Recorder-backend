#!/bin/bash
set -e

Xvfb :99 -screen 0 1280x720x24 &
export DISPLAY=:99
sleep 1

pulseaudio --start --exit-idle-time=-1
pactl load-module module-null-sink sink_name=virtual_sink sink_properties=device.description=VirtualSink
pactl set-default-sink virtual_sink
pactl set-default-source virtual_sink.monitor
export PULSE_SOURCE=virtual_sink.monitor
sleep 1

cd /frontend && PORT=3000 npm start &

cd /backend && npm run start:prod &

exec nginx -g "daemon off;"
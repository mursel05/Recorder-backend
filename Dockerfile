FROM node:20-slim

# Install dependencies + add Google Chrome repo
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    --no-install-recommends \
    && wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" \
    > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update && apt-get install -y \
    google-chrome-stable \
    ffmpeg \
    xvfb \
    pulseaudio \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install

COPY src/ ./src/

RUN mkdir -p /app/recordings

# Startup script that launches Xvfb + PulseAudio before the bot
COPY start.sh /start.sh
RUN chmod +x /start.sh

ENV DISPLAY=:99
ENV CHROME_PATH=/usr/bin/google-chrome
ENV OUTPUT_DIR=/app/recordings

ENTRYPOINT ["/start.sh"]
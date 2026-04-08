FROM node:20-slim

RUN apt-get update && apt-get install -y \
    wget \
    git \
    nginx \
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

WORKDIR /frontend
RUN git clone https://github.com/mursel05/Recorder.git .
RUN npm install
COPY .env .env
RUN npm run build

WORKDIR /backend
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

COPY nginx.conf /etc/nginx/nginx.conf

COPY start.sh /start.sh
RUN chmod +x /start.sh

ENV DISPLAY=:99
ENV CHROME_PATH=/usr/bin/google-chrome

EXPOSE 80
CMD ["/start.sh"]
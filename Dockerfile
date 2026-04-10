FROM node:20-alpine

RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    nginx \
    ffmpeg \
    xvfb \
    pulseaudio \
    pulseaudio-utils \
    chromium

WORKDIR /frontend
RUN git clone https://github.com/mursel05/Recorder.git .
RUN npm install
COPY .env .env
RUN npm run build

WORKDIR /backend
COPY package*.json ./
RUN npm install
COPY . .
RUN rm -f .env
RUN npm run build

COPY nginx.conf /etc/nginx/nginx.conf

COPY start.sh /start.sh
RUN chmod +x /start.sh

ENV DISPLAY=:99
ENV CHROME_PATH=/usr/bin/chromium

EXPOSE 80
CMD ["/start.sh"]

FROM node:8-slim

RUN apt-get update && \
	apt-get install -y \
		graphicsmagick

RUN apt-get clean && rm -rf /var/lib/apt/lists/*

ENV DB_HOST mongodb
ENV DB_USERNAME thepool
ENV DB_PASSWORD 54faf1c93837
ENV DB_NAME thepool

WORKDIR /app/

ENTRYPOINT ["/usr/local/bin/node", "index.js"]

COPY node_modules/ /app/node_modules/
COPY assets/ /app/assets/
COPY views/ /app/views/
COPY frontend.js /app/frontend.js
COPY backend.js /app/backend.js
COPY files.js /app/files.js
COPY models.js /app/models.js
COPY index.js /app/index.js
COPY tools.js /app/tools.js
COPY config.js /app/config.js

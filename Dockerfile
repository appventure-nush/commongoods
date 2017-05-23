FROM test.makerforce.io:8443/run-images/ubuntu-nodejs:master

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
COPY gm /usr/local/bin/gm

ENV DB_HOST mongodb
ENV DB_USER root
ENV DB_PASSWORD thepool
ENV DB_NAME thepool

WORKDIR /app/

ENTRYPOINT ["/usr/local/bin/node", "index.js"]

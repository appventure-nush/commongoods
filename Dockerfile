FROM ubuntu
    
COPY node_modules/ /app/node_modules/
COPY assets/ /app/assets/
COPY views/ /app/views/
COPY frontend.js /app/frontend.js
COPY backend.js /app/backend.js
COPY files.js /app/files.js
COPY models.js /app/models.js
COPY index.js /app/index.js
COPY tools.js /app/tools.js
COPY gm /bin/gm
COPY /usr/bin/node /bin/node

ENV IP 0.0.0.0
ENV PORT 8080
EXPOSE 8080
ENV DATA_DIR /data
VOLUME /data

ENV DB_HOST localhost
ENV DB_PORT 27100
ENV DB_USER root
ENV DB_PASSWORD ""
ENV DB_NAME thepool

WORKDIR /app/

ENTRYPOINT ["/bin/node", "index.js"]

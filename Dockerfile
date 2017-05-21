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

ENV DB_SOCKET $SOCKET_DIR/thepool-mongodb.sock
ENV DB_USER root
ENV DB_PASSWORD ""
ENV DB_NAME thepool

WORKDIR /app/

ENTRYPOINT ["/bin/node", "index.js"]

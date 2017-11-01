FROM node:8-alpine as grunt

RUN mkdir -p /src
WORKDIR /src
RUN apk add --no-cache python2 make g++
COPY . /src/
RUN yarn install
RUN node ./node_modules/grunt-cli/bin/grunt


FROM node:8-alpine

RUN apk add --no-cache graphicsmagick

ENV DB_HOST commongoods-db
ENV DB_USERNAME thepool
ENV DB_PASSWORD 54faf1c93837
ENV DB_NAME thepool

WORKDIR /app/

ENTRYPOINT ["/usr/local/bin/node", "index.js"]

COPY --from=grunt /src /app

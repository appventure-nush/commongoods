#!/bin/bash

# Build mongodb:
# https://raw.githubusercontent.com/containers/build/master/examples/mongodb/build-mongodb.sh

rkt run \
	--net=default \
	mongodb-latest-linux-amd64.aci \
		--port=mongo:27100

# Then set up mongodb

rkt run \
	app.aci \
		--set-env=DB_HOST=localhost \
		--set-env=DB_PORT=27100 \
		--set-env=DB_USER=test \
		--set-env=DB_PASSWORD=test123 \
		--set-env=DB_NAME=thepool \
		--volume data,kind=host,source=/tmp/testdata \
		--port=http:8080

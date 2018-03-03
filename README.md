
# commongoods [![Build Status](https://appventure.nushigh.edu.sg:8000/api/badges/appventure-nush/commongoods/status.svg)](https://appventure.nushigh.edu.sg:8000/appventure-nush/commongoods)

A fork of commongoods for the staff, running as a container. 

Network:
* primary

Volumes:
* commongoods_data:/data

Environment:
* DB_USERNAME=commongoods
* DB_PASSWORD
* DB_HOST=commongoods-db
* DB_NAME=commongoods
* DB_AUTHSOURCE=admin
* IP=0.0.0.0

# commongoods-db

Image: mongo

Network:
* primary

Volumes:
* commongoods-db_data:/data/db

Environment:
* MONGO_INITDB_ROOT_USERNAME=commongoods
* MONGO_INITDB_ROOT_PASSWORD
* MONGO_INITDB_DATABASE=commongoods

## Developing

Requirements:

- Node.js
- `npm i -g grunt-cli`
- MongoDB


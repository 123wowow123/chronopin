# First Stage Build

## node:9-alpine
## node:9
FROM node:9-alpine AS base
 
## Environment Variables
ENV PROJECT_ROOT /code

## Create App Directory
RUN mkdir -p $PROJECT_ROOT
WORKDIR $PROJECT_ROOT

## Install nslookup
RUN apk add --update --no-cache bind-tools
 
## Install App Dependencies
COPY package.json $PROJECT_ROOT
RUN npm install

## Bower Setup
COPY bower.json $PROJECT_ROOT
RUN apk update && apk upgrade && \
    apk add --no-cache bash git openssh
 
## Bundle App Source
COPY . ${PROJECT_ROOT}

## Install Bower Libs
RUN npm run bower:install

# VOLUME ["$(pwd)/server:/code/server", "$(pwd)/client:/code/client"]

ENTRYPOINT ["grunt"]
CMD ["serve"]
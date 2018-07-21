# First Stage Build

## node:9-alpine
## node:9
FROM node:9-alpine AS base
 
## Environment Variables
ENV PROJECT_ROOT /code

## Create app directory
RUN mkdir -p $PROJECT_ROOT
WORKDIR $PROJECT_ROOT

## Install nslookup
RUN apk add --update --no-cache bind-tools
 
## Install app dependencies
COPY package.json $PROJECT_ROOT
RUN npm install
COPY bower.json $PROJECT_ROOT
RUN apk update && apk upgrade && \
    apk add --no-cache bash git openssh
RUN npm run bower:install
 
## Bundle app source
COPY . ${PROJECT_ROOT}

# VOLUME ["$(pwd)/server:/code/server", "$(pwd)/client:/code/client"]

ENTRYPOINT ["grunt"]
CMD ["serve"]
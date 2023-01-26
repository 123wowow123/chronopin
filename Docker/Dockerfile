# First Stage Build
FROM node:16-alpine AS base
 
## Environment Variables
ENV PROJECT_ROOT /code

## Create App Directory
RUN mkdir -p $PROJECT_ROOT
WORKDIR $PROJECT_ROOT
 
## Install python3 for node-sass
RUN apk add --update --no-cache curl py-pip

RUN npm install --ignore-scripts puppeteer

## Install App Dependencies
COPY package.json $PROJECT_ROOT
RUN npm install

## Bower Setup
COPY bower.json $PROJECT_ROOT
RUN apk update && apk upgrade && \
    apk add --no-cache bash git openssh

## Bundle App Source
COPY . ${PROJECT_ROOT}

## Install Bower Libs and Compile
RUN npm run bower:install
RUN npm run build


# Second Stage
## node:9-alpine ~223MB
## node:9        ~829MB
FROM node:16-alpine AS prod

## Environment Variables
ENV PROJECT_ROOT /code

RUN mkdir -p $PROJECT_ROOT
WORKDIR $PROJECT_ROOT

## Install nslookup
RUN apk add --update --no-cache bind-tools

COPY --from=base ${PROJECT_ROOT}/dist $PROJECT_ROOT

# Change this for dev
RUN npm install --only=production

EXPOSE 9000
## EXPOSE 80
## EXPOSE 1433 

ENTRYPOINT ["npm"]
CMD ["start"]
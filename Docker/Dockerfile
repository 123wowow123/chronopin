# First Stage Build
FROM node:22-alpine AS base
 
## Environment Variables
ENV PROJECT_ROOT /code

## Create App Directory
RUN mkdir -p $PROJECT_ROOT
WORKDIR $PROJECT_ROOT
 
RUN apk add --update --no-cache curl

## Bundle App Source
COPY . ${PROJECT_ROOT}

# Chromium comes from apk in the prod stage
ENV PUPPETEER_SKIP_DOWNLOAD="true"

## Install App Dependencies
# COPY package.json $PROJECT_ROOT
RUN npm install

## Bower Setup
# COPY bower.json $PROJECT_ROOT
RUN apk update && apk upgrade && \
    apk add --no-cache bash git openssh

## Install Bower Libs and Compile
RUN npm run bower:install
RUN npm run build


# Second Stage
FROM node:22-alpine AS prod

## Environment Variables
ENV PROJECT_ROOT /code

RUN mkdir -p $PROJECT_ROOT
WORKDIR $PROJECT_ROOT

# bind-tools provides nslookup
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont \
      bind-tools

# Puppeteer drives the apk Chromium instead of downloading its own
ENV PUPPETEER_SKIP_DOWNLOAD="true"
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

## Install nslookup
# RUN apk add --update --no-cache bind-tools

COPY --from=base ${PROJECT_ROOT}/dist $PROJECT_ROOT

# Change this for dev
RUN npm install --omit=dev

EXPOSE 9000
## EXPOSE 80
## EXPOSE 1433 

ENTRYPOINT ["npm"]
CMD ["start"]
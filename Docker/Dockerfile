# First Stage Build
FROM node:16-alpine AS base
 
## Environment Variables
ENV PROJECT_ROOT /code

## Create App Directory
RUN mkdir -p $PROJECT_ROOT
WORKDIR $PROJECT_ROOT
 
## Install python3 for node-sass
RUN apk add --update --no-cache curl py-pip

## Bundle App Source
COPY . ${PROJECT_ROOT}

# Download Chromium in 2nd Phase
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD="true"

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
## node:9-alpine ~223MB
## node:9        ~829MB
FROM node:16-alpine AS prod

## Environment Variables
ENV PROJECT_ROOT /code

RUN mkdir -p $PROJECT_ROOT
WORKDIR $PROJECT_ROOT

# Install nslookup 'bind-tools' not park of chrome list install
# Installs latest Chromium (100) package.
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont \
      yarn \
      bind-tools 

# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Puppeteer v13.5.0 works with Chromium 100.
RUN yarn add puppeteer@13.5.0

## Install nslookup
# RUN apk add --update --no-cache bind-tools

COPY --from=base ${PROJECT_ROOT}/dist $PROJECT_ROOT

# Change this for dev
RUN npm install --only=production

EXPOSE 9000
## EXPOSE 80
## EXPOSE 1433 

ENTRYPOINT ["npm"]
CMD ["start"]
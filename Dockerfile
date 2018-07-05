# First Stage Build
FROM node:9-alpine AS base
 
## Environment Variables
ENV PROJECT_ROOT /code

## Create app directory
RUN mkdir -p $PROJECT_ROOT
WORKDIR $PROJECT_ROOT
 
## Install app dependencies
COPY package.json $PROJECT_ROOT
RUN npm install 
RUN npm install -g grunt-cli
 
## Bundle app source
COPY . ${PROJECT_ROOT}

RUN npm run-script build


# Second Stage
## node:9-alpine ~223MB
## node:9        ~829MB
FROM node:9-alpine AS prod

## Environment Variables
ENV PROJECT_ROOT /code

RUN mkdir -p $PROJECT_ROOT
WORKDIR $PROJECT_ROOT

## Install nslookup
RUN apk add --update --no-cache bind-tools

COPY --from=base ${PROJECT_ROOT}/dist $PROJECT_ROOT

# change this for dev
RUN npm install --only=production

EXPOSE 9000
## EXPOSE 80
## EXPOSE 1433 

ENTRYPOINT ["npm"]
CMD ["start"]
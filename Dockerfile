FROM node:9-alpine
 
# Environment Variables

ENV PROJECT_ROOT /code

# Create app directory
RUN mkdir -p $PROJECT_ROOT
WORKDIR $PROJECT_ROOT
 
# Install app dependencies
COPY package.json $PROJECT_ROOT
RUN npm install
 
# Bundle app source
COPY . $PROJECT_ROOT
 
EXPOSE 9000
# EXPOSE 1433 

CMD [ "npm", "start" ]
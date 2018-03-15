FROM node:9.5-alpine
 
# Environment Variables

ENV NODE_ENV=development

# Create app directory
RUN mkdir -p /code
WORKDIR /code
 
# Install app dependencies
COPY package.json /code
RUN npm install
 
# Bundle app source
COPY . /code
 
EXPOSE 9000
CMD [ "npm", "start" ]
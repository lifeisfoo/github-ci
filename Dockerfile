FROM alpine:3.8

# https://wiki.alpinelinux.org/wiki/Docker#Docker_Compose
RUN apk update && apk add \
    aha \
    git \
    nodejs \
    npm \
    docker \
    py-pip \
    && pip install docker-compose

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package*.json /usr/src/app/
RUN npm install
COPY . /usr/src/app

EXPOSE 80

CMD [ "npm", "start" ]
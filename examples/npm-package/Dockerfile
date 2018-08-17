FROM node:8.11.3-alpine

ARG NPM_REGISTRY_URL
ARG NPM_REGISTRY_TOKEN
ARG NPM_REGISTRY_SCOPE
ARG NPM_REGISTRY_SCOPE
ARG CI_IMAGE_TAG
ARG CI_IMAGE_NAME

RUN mkdir -p /usr/src/lib
WORKDIR /usr/src/lib

# Install app dependencies
COPY * /usr/src/lib/

RUN echo "@${NPM_REGISTRY_SCOPE}:registry=http://${NPM_REGISTRY_URL}/" > /root/.npmrc
RUN echo "//${NPM_REGISTRY_URL}/:_authToken=${NPM_REGISTRY_TOKEN}" >> /root/.npmrc
RUN echo "Logged in as:" $(npm whoami --registry http://${NPM_REGISTRY_URL})
RUN echo "Image name is ${CI_IMAGE_NAME}, image tag is ${CI_IMAGE_TAG}"

RUN npm publish

# Otherwise, if you want publish only on git tags creation use this
# RUN (echo "$CI_IMAGE_TAG" | grep -Eq  "^\d+\.\d+\.\d+$") && npm publish || echo "Image tag doesn't match, skipping publication"

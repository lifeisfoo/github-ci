git clone -b $BRANCH \
    --single-branch \
    https://$GITHUB_ACCESS_TOKEN@github.com/$REPO.git $BUILD_DIR && \
    cd $BUILD_DIR && \
    git checkout $COMMIT && \
    docker login --username $DOCKER_USER --password $DOCKER_PASS $DOCKER_REGISTRY&& \
    docker build -t $DOCKER_REGISTRY/$IMAGE_NAME:$IMAGE_TAG . && \
    docker-compose -f docker-compose.test.yml \
        up --build \
        --force-recreate \
        --abort-on-container-exit \
        --exit-code-from sut && \
    docker push $DOCKER_REGISTRY/$IMAGE_NAME:$IMAGE_TAG && \
    if [ "$IMAGE_TAG" = "master" ]; then docker tag $DOCKER_REGISTRY/$IMAGE_NAME:$IMAGE_TAG $DOCKER_REGISTRY/$IMAGE_NAME:latest && docker push $DOCKER_REGISTRY/$IMAGE_NAME:latest; fi

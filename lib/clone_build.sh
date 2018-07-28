git clone -b $BRANCH \
    --single-branch \
    https://$GITHUB_ACCESS_TOKEN@github.com/$REPO.git $BUILD_DIR && \
    cd $BUILD_DIR && \
    git checkout $COMMIT && \
    docker login --username $DOCKER_USER --password $DOCKER_PASS $DOCKER_REGISTRY&& \
    docker build $DOCKER_BUILD_ARGS -t $DOCKER_REGISTRY/$IMAGE_NAME:$IMAGE_TAG .
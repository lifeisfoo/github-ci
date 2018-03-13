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
    docker push $DOCKER_REGISTRY/$IMAGE_NAME:$IMAGE_TAG


    # TODO save docker auth data in $HOME/.docker/config.json
    # OR cat ~/my_password.txt | docker login --username foo --password-stdin
    # see https://docs.docker.com/engine/reference/commandline/login/#extended-description
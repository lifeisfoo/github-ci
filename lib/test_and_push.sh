docker-compose -f docker-compose.test.yml \
    up --build \
    --force-recreate \
    --renew-anon-volumes \
    --abort-on-container-exit \
    --exit-code-from sut && \
    docker push $DOCKER_REGISTRY/$IMAGE_NAME:$IMAGE_TAG && \
    if [ "$IMAGE_TAG" = "master" ]; then docker tag $DOCKER_REGISTRY/$IMAGE_NAME:$IMAGE_TAG $DOCKER_REGISTRY/$IMAGE_NAME:latest && docker push $DOCKER_REGISTRY/$IMAGE_NAME:latest; fi

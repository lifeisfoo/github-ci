# ISSUES

## Redis errors

    message: 'MISCONF Redis is configured to save RDB snapshots, but is currently not able to persist on disk. Commands that may modify the data set are disabled. Please check Redis logs for details about the error.', 

> config set stop-writes-on-bgsave-error no

https://stackoverflow.com/a/21484282/3340702

## Build queue is stuck

    redis-cli

look for a `bull:builds:ID:lock` key

then

    DEL bull:builds:904:lock

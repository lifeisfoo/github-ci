const express = require('express');
const bodyParser = require('body-parser');

require('dotenv').config();

const DEFAULT_GITHUB_ORG = process.env.DEFAULT_GITHUB_ORG || '';
const PORT = process.env.PORT || 80;

const ACTIVE_REPOS = process.env.ACTIVE_REPOS.split(',');
const SUPPORTED_EVENTS = ['pull_request', 'push', 'status', 'create'];

console.log('Default Github organization is', DEFAULT_GITHUB_ORG);
console.log('Active repositories are', JSON.stringify(ACTIVE_REPOS));
console.log('Supported events are', JSON.stringify(SUPPORTED_EVENTS));

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const builds_queue = require('./lib/build-queue')(REDIS_URL);

const app = express();
app.use(bodyParser.json());

function check_supported_events(req, res, next) {
    const event_name = req.headers['x-github-event'];
    if (SUPPORTED_EVENTS.indexOf(event_name) !== -1) {
        console.log(event_name, 'is supported');
        req.event_name = event_name;
        next();
    } else {
        console.log(event_name, 'is not supported, skip');
        return res.status(200).end();
    }
}

function check_repository_active(req, res, next) {
    const repo_full_name = req.body.repository.full_name;
    
    const repo_name = req.body.repository.name;
    const alternative_repo_full_name = `${DEFAULT_GITHUB_ORG}/${repo_name}`;

    if (ACTIVE_REPOS.indexOf(repo_full_name) !== -1) {
        console.log(repo_full_name, 'is active');
        req.repo_full_name = repo_full_name;
        next();
    } else if (ACTIVE_REPOS.indexOf(repo_name) !== -1) {
        console.log(alternative_repo_full_name, 'is active (alternative)');
        req.repo_full_name = alternative_repo_full_name;
        next();
    } else {
        console.log(repo_full_name, 'or', alternative_repo_full_name, 'is not active, skip');
        return res.status(200).end();
    }
}

app.post('/events-handler',
    check_supported_events,
    check_repository_active,
     (req, res) => {

    switch (req.event_name) {
    case 'pull_request':
        builds_queue.handle_pull_request(req);
        res.status(200).end();
        break;
    case 'push':
        builds_queue.handle_push(req);
        res.status(200).end();
        break;
    case 'status':
        builds_queue.handle_status(req);
        res.status(200).end();
        break;
    case 'create':
        builds_queue.handle_create(req);
        res.status(200).end();
        break;
    default:
        console.log('Default');
        res.status(200).end();
    }
});

app.listen(PORT, () => console.log(`Github CI app listening on port ${PORT}`));

#!/bin/bash
#
#   Copyright 2018 Alessandro Miliucci
#
#   This program is free software: you can redistribute it and/or modify
#   it under the terms of the GNU Affero General Public License as published by
#   the Free Software Foundation, either version 3 of the License, or
#   (at your option) any later version.
#
#   This program is distributed in the hope that it will be useful,
#   but WITHOUT ANY WARRANTY; without even the implied warranty of
#   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#   GNU Affero General Public License for more details.
#
#   You should have received a copy of the GNU Affero General Public License
#   along with this program.  If not, see <https://www.gnu.org/licenses/>.
#

# Tested with ubuntu 16.04 and 18.04

apt-get update

echo "Installing Redis"
apt-get install redis-server
systemctl status redis
redis-cli config set stop-writes-on-bgsave-error no

echo "Installing Node"
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
apt-get install nodejs

echo "Installing Docker and docker-compose"
apt-get install \
    apt-transport-https \
    ca-certificates \
    curl \
    software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
add-apt-repository \
   "deb [arch=amd64] https://download.docker.com/linux/ubuntu \
   $(lsb_release -cs) \
   stable"
apt-get update
apt-get install docker-ce
sudo curl -L https://github.com/docker/compose/releases/download/1.22.0/docker-compose-$(uname -s)-$(uname -m) -o /usr/local/bin/docker-compose

echo "Installing external dependencies"
apt-get install aha
npm install pm2 -g

echo "Downloading latest sources"
git clone https://github.com/lifeisfoo/github-ci.git
cd github-ci
npm install

echo "***********************\n"
echo "Installation completed!"
echo "Now edit the .env file and run the ci using 'pm2 start index.js'"
echo "Remember to open the 3000 port using 'ufw allow 3000'"
echo "To debug the app run 'pm2 logs'"
echo "To update, 'git pull origin master' and 'pm2 reload all'"
echo "\n***********************"
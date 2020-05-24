FROM ubuntu:18.04
RUN apt-get update
RUN apt-get install -y nginx nodejs npm
RUN nodejs -v
RUN npm -v
RUN npm i -g pm2
COPY ./udp/nginx/nginx.conf /etc/nginx/nginx.conf
RUN nginx -t
RUN mkdir -p /app/udp
WORKDIR /app
COPY ./udp/udp-server.js /app/udp
COPY ./controllers /app/controllers
COPY ./udp/package.json /app
RUN npm install
COPY config.json /app
CMD pm2 start ./udp/udp-server.js -- port=12001 && pm2 start -f ./udp/udp-server.js -- port=12002 && nginx -g "daemon off;"
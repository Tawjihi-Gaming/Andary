FROM nginx:stable-alpine3.23

COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/ /etc/nginx/conf.d/

RUN mkdir -p /etc/ssl

COPY cert.pem /etc/ssl
COPY key.pem /etc/ssl

EXPOSE 80 443

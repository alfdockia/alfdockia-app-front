# 1. Generate licenses

FROM node:22.14.0-alpine AS builder
WORKDIR /usr/src/alfresco
COPY package.json package.json

RUN mkdir -p ./licenses && \
  yarn licenses list --production > ./licenses/licenses.txt && \
  yarn licenses generate-disclaimer --production > ./licenses/disclaimer.txt

# 2. Generate image

FROM nginxinc/nginx-unprivileged:1-alpine

LABEL org.opencontainers.image.title="alfdockia-content-app" \
      org.opencontainers.image.version="1.2.2" \
      org.opencontainers.image.vendor="AIgen Technologies S.L"

USER root
RUN apk update && apk upgrade
USER 101

COPY docker/default.conf.template /etc/nginx/templates/
COPY docker/docker-entrypoint.d/* /docker-entrypoint.d/

COPY dist/content-ce /usr/share/nginx/html/
COPY NOTICE /usr/share/nginx/html/NOTICE
COPY dist/content-ce/app.config.json /etc/nginx/templates/app.config.json.template
COPY dist/content-ce/assets/app.extensions.json /etc/nginx/templates/app.extensions.json.template
COPY --from=builder /usr/src/alfresco/licenses /usr/share/nginx/html/

USER root
RUN chmod a+w -R /etc/nginx/conf.d && \
    chmod +x /docker-entrypoint.d/30-sed-on-appconfig.sh
USER 101

ENV BASE_PATH=/
ENV SEARCH_URL=http://alfresco-qdrant-search:8084/search
ENV NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx/conf.d

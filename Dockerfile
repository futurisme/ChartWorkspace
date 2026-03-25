FROM debian:bookworm-slim AS builder

ENV DEBIAN_FRONTEND=noninteractive
ENV ANDROID_HOME=/opt/android-sdk
ENV ANDROID_SDK_ROOT=/opt/android-sdk
ENV JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
ENV PATH="${PATH}:${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools"

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    unzip \
    zip \
    xz-utils \
    openjdk-21-jdk \
  && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
  && apt-get install -y --no-install-recommends nodejs \
  && rm -rf /var/lib/apt/lists/*

RUN mkdir -p "${ANDROID_HOME}/cmdline-tools" \
  && curl -fsSL https://dl.google.com/android/repository/commandlinetools-linux-13114758_latest.zip -o /tmp/cmdline-tools.zip \
  && unzip -q /tmp/cmdline-tools.zip -d "${ANDROID_HOME}/cmdline-tools" \
  && mv "${ANDROID_HOME}/cmdline-tools/cmdline-tools" "${ANDROID_HOME}/cmdline-tools/latest" \
  && rm -f /tmp/cmdline-tools.zip

RUN yes | sdkmanager --licenses >/dev/null || true
RUN sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"

WORKDIR /app
COPY . .

RUN npm ci \
  && npm run build \
  && npx next export || true \
  && mkdir -p /tmp/game-export \
  && if [[ -f out/game/index.html ]]; then cp -R out/game/. /tmp/game-export/; else \
       printf '%s' '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ChartWorkspace /game</title></head><body><h1>/game export unavailable</h1></body></html>' > /tmp/game-export/index.html; \
     fi

RUN mkdir -p /tmp/cap-build/game \
  && cd /tmp/cap-build \
  && printf '%s' '{"name":"railway-game-apk","private":true,"version":"1.0.0","dependencies":{"@capacitor/android":"^7.0.0","@capacitor/cli":"^7.0.0","@capacitor/core":"^7.0.0"}}' > package.json \
  && npm install \
  && cp -R /tmp/game-export/. ./game/ \
  && printf '%s' '{"appId":"com.chartworkspace.game","appName":"ChartWorkspace Game","webDir":"game","server":{"androidScheme":"app"}}' > capacitor.config.json

RUN cd /tmp/cap-build \
  && npx cap add android \
  && npx cap sync android \
  && sed -i 's/minifyEnabled false/minifyEnabled true/g' android/app/build.gradle \
  && (grep -q 'shrinkResources true' android/app/build.gradle || sed -i '/minifyEnabled true/a\            shrinkResources true' android/app/build.gradle) \
  && (grep -q 'resConfigs "en"' android/app/build.gradle || sed -i '/defaultConfig {/a\        resConfigs "en"' android/app/build.gradle) \
  && printf '\nandroid.enableR8.fullMode=true\n' >> android/gradle.properties \
  && cd android \
  && chmod +x ./gradlew \
  && ./gradlew --no-daemon clean assembleRelease

RUN mkdir -p /tmp/artifacts/downloads \
  && cp /tmp/cap-build/android/app/build/outputs/apk/release/app-release-unsigned.apk /tmp/artifacts/downloads/latest-game.apk \
  && cp -R /tmp/game-export/. /tmp/artifacts/ \
  && COMMIT_HASH="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)" \
  && BUILD_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  && printf '{"version":"%s","builtAt":"%s"}\n' "${COMMIT_HASH}" "${BUILD_TIME}" > /tmp/artifacts/version.json

FROM nginx:1.27-alpine AS runner

COPY --from=builder /tmp/artifacts/ /usr/share/nginx/html/
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

ENV PORT=8080
EXPOSE 8080

CMD ["/bin/sh", "-c", "envsubst '$PORT' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]

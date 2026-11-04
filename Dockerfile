FROM --platform=$BUILDPLATFORM node:24-bookworm-slim@sha256:c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c AS web
WORKDIR /src/web
COPY src/web/package.json src/web/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY src/web/ ./
RUN npm run check:translations && npx ng build apiary

FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:10.0-noble@sha256:de4fe90a98845d75910b9769662465c84de1a934665c431279d1382b2bddc02b AS server
ARG TARGETARCH
WORKDIR /src
COPY global.json Directory.Build.props Directory.Packages.props BannedSymbols.txt CodeMetricsConfig.txt .editorconfig ./
COPY src/ src/
RUN dotnet publish src/Datapoint.Apiary -c Release -a $TARGETARCH --self-contained false -o /app -p:UseAppHost=true
COPY --from=web /src/Datapoint.Apiary/wwwroot/ /app/wwwroot/

FROM mcr.microsoft.com/dotnet/aspnet:10.0-noble-chiseled-extra@sha256:9b755ea799ae649141a073e30d8b62d8095a5465af2b7694d17866e8c05131d8 AS runtime

# The chiseled image has no package manager, so libmsquic (for HTTP/3) and the
# libnuma it links to are installed here and copied in, with their entries in
# dpkg's status file so image scanners still see them.
FROM mcr.microsoft.com/dotnet/aspnet:10.0-noble@sha256:de0ee358cdd672f7017a003bed21e9ac9ed48a27c922a59b18175b6e82fa7fee AS quic
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && curl -fsSL https://packages.microsoft.com/config/ubuntu/24.04/packages-microsoft-prod.deb -o /tmp/packages-microsoft-prod.deb \
    && dpkg -i /tmp/packages-microsoft-prod.deb \
    && apt-get update \
    && apt-get install -y --no-install-recommends libmsquic
COPY --from=runtime /var/lib/dpkg/status /rootfs/var/lib/dpkg/status
RUN for lib in libmsquic.so.2 libnuma.so.1; do \
        path=$(ldconfig -p | awk -v lib="$lib" '$1 == lib { print $NF; exit }'); \
        dir=$(dirname "$(realpath "$path")"); \
        mkdir -p "/rootfs$dir" && cp -L "$path" "/rootfs$dir/$lib"; \
    done \
    && printf '\n' >> /rootfs/var/lib/dpkg/status \
    && dpkg-query -s libmsquic libnuma1 >> /rootfs/var/lib/dpkg/status \
    && mkdir /rootfs/data /rootfs/keys \
    && chown app:app /rootfs/data /rootfs/keys

FROM runtime
COPY --from=quic /rootfs/ /
WORKDIR /app
COPY --from=server /app/ ./
COPY LICENSE NOTICE TRADEMARKS.md THIRD-PARTY-NOTICES.txt ./
ENV PATH="/app:${PATH}" \
    ASPNETCORE_ENVIRONMENT=Production \
    Apiary__DataDirectory=/data \
    Apiary__KeyDirectory=/keys
USER app
VOLUME /data /keys
EXPOSE 8080 8443 8443/udp 9443
HEALTHCHECK --interval=10s --timeout=6s --start-period=20s --retries=3 CMD ["apiary", "health"]
ENTRYPOINT ["apiary"]

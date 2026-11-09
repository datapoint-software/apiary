FROM --platform=$BUILDPLATFORM node:24-bookworm-slim@sha256:01d566e8d94d8c619591d78652babfccd3c6992a3dffa9ed5ab39e11cf6c70e9 AS web
WORKDIR /src/web
COPY src/web/package.json src/web/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY src/web/ ./
RUN npm run check:translations && npx ng build apiary

FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:10.0-noble@sha256:212fe4cb74627d5adf9817a4088906ae3edff1bd853bb27565d4b46731efe61e AS server
ARG TARGETARCH
WORKDIR /src
COPY global.json Directory.Build.props Directory.Packages.props BannedSymbols.txt CodeMetricsConfig.txt .editorconfig ./
COPY src/ src/
RUN dotnet publish src/Datapoint.Apiary -c Release -a $TARGETARCH --self-contained false -o /app -p:UseAppHost=true
COPY --from=web /src/Datapoint.Apiary/wwwroot/ /app/wwwroot/

FROM mcr.microsoft.com/dotnet/aspnet:10.0-noble-chiseled-extra@sha256:a9298ccc39c6258ae71228479e2f3f8d2ceb6639a9927262a4b0ff7d319a0e7e AS runtime

# The chiseled image has no package manager, so libmsquic (for HTTP/3) and the
# libnuma it links to are installed here and copied in, with their entries in
# dpkg's status file so image scanners still see them.
FROM mcr.microsoft.com/dotnet/aspnet:10.0-noble@sha256:1a48394b6f29d3a32c79d9edecd4abda0ecbe8776d567dbfc4590ed6979c740c AS quic
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

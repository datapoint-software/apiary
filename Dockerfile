FROM --platform=$BUILDPLATFORM node:24-bookworm-slim@sha256:dc26ae92c9fb15cf6b1d63e20f0944b2efe0f115b20e00be48fb23fceb061c54 AS web
WORKDIR /src/web
COPY src/web/package.json src/web/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY src/web/ ./
RUN npm run check:translations && npx ng build apiary

FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:10.0-noble@sha256:fe0fd4e93bd2fbb47c883b7a6369e5c8d3db8bf01cdc5981f6ee35fbdf3ff4fb AS server
ARG TARGETARCH
WORKDIR /src
COPY global.json Directory.Build.props Directory.Packages.props BannedSymbols.txt CodeMetricsConfig.txt .editorconfig ./
COPY src/ src/
RUN dotnet publish src/Datapoint.Apiary -c Release -a $TARGETARCH --self-contained false -o /app -p:UseAppHost=true
COPY --from=web /src/Datapoint.Apiary/wwwroot/ /app/wwwroot/

FROM mcr.microsoft.com/dotnet/aspnet:10.0-noble-chiseled-extra@sha256:cae5b962bfb786606def03d250c6a645cc98839095c89e806e4bd8978a68115b AS runtime

# The chiseled image has no package manager, so libmsquic (for HTTP/3) and the
# libnuma it links to are installed here and copied in, with their entries in
# dpkg's status file so image scanners still see them.
FROM mcr.microsoft.com/dotnet/aspnet:10.0-noble@sha256:bfd912c83295ce66d4b706ebb8541b9f14259b0e76fbb88b2751f58ce2399d2e AS quic
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

FROM --platform=$BUILDPLATFORM node:24-bookworm-slim AS web
WORKDIR /src/web
COPY src/web/package.json src/web/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY src/web/ ./
RUN npx ng build apiary

FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:10.0-noble AS server
ARG TARGETARCH
WORKDIR /src
COPY global.json Directory.Build.props Directory.Packages.props BannedSymbols.txt CodeMetricsConfig.txt .editorconfig ./
COPY src/ src/
RUN dotnet publish src/Datapoint.Apiary -c Release -a $TARGETARCH --self-contained false -o /app -p:UseAppHost=true
COPY --from=web /src/Datapoint.Apiary/wwwroot/ /app/wwwroot/

FROM mcr.microsoft.com/dotnet/aspnet:10.0-noble
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && curl -fsSL https://packages.microsoft.com/config/ubuntu/24.04/packages-microsoft-prod.deb -o /tmp/packages-microsoft-prod.deb \
    && dpkg -i /tmp/packages-microsoft-prod.deb \
    && rm /tmp/packages-microsoft-prod.deb \
    && apt-get update \
    && apt-get install -y --no-install-recommends libmsquic \
    && apt-get purge -y curl \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir /data /keys \
    && chown app:app /data /keys
WORKDIR /app
COPY --from=server /app/ ./
ENV PATH="/app:${PATH}" \
    ASPNETCORE_ENVIRONMENT=Production \
    Apiary__DataDirectory=/data \
    Apiary__KeyDirectory=/keys
USER app
VOLUME /data /keys
EXPOSE 8080 8443 8443/udp 9443
HEALTHCHECK --interval=10s --timeout=6s --start-period=20s --retries=3 CMD ["apiary", "health"]
ENTRYPOINT ["apiary"]

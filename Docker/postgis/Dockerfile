# Local PostgreSQL with PostGIS, for development.
#
# Built on the official postgres image because it is published for both
# arm64 and amd64, so it runs natively on Apple Silicon and Intel alike. The
# official postgis/postgis image is amd64-only. The postgres image already has
# the PostgreSQL project's apt repository configured, which carries PostGIS
# builds for both architectures.
FROM postgres:17-bookworm

RUN apt-get update \
  && apt-get install -y --no-install-recommends postgresql-17-postgis-3 \
  && rm -rf /var/lib/apt/lists/*

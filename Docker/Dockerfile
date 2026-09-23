# Chronopin: Next.js standalone server on Node.js 24 LTS.
#
#   docker build -f Docker/Dockerfile -t chronopin .
#   docker run --rm -p 9000:9000 --env-file Docker/env.prod.list chronopin
#
# No database is needed to build: pages that read data render per request.

# --- Dependencies and build ---------------------------------------------------
FROM node:24-alpine AS build
WORKDIR /code

# Chromium for the scraper comes from apk in the runtime image.
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Runtime --------------------------------------------------------------------
FROM node:24-alpine AS runtime
WORKDIR /app

# Chromium and fonts for puppeteer (page scraping); bind-tools for nslookup.
#
# poppler-utils and tesseract-ocr are the PDF reader
# (src/server/scrape/pdfText.ts): pdftotext and pdfinfo for a filing's text
# layer, pdftoppm and tesseract to OCR one that is a scan. Without them a PDF
# source fails the whole scrape, because the fetch is the one stage that may.
# tesseract-ocr-data-eng is the English model; tesseract ships no language data
# of its own. Measured: they add about 72MB to the image.
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont bind-tools \
    poppler-utils tesseract-ocr tesseract-ocr-data-eng

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    PORT=9000 \
    HOSTNAME=0.0.0.0

# The standalone output is the server plus only the node_modules it uses.
COPY --from=build /code/.next/standalone ./
COPY --from=build /code/.next/static ./.next/static
COPY --from=build /code/public ./public
# The OKF docs: the daily pin jobs read their strategy from them at run time
# (src/server/jobs/prompt.ts).
COPY --from=build /code/docs/okf ./docs/okf

USER node
EXPOSE 9000
CMD ["node", "server.js"]

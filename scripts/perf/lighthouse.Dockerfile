# Lighthouse in a Linux container (task 39): numbers free of host noise — on Windows dev machines
# antivirus web filters (e.g. Kaspersky) proxy the browser's HTTP traffic, decompress the HTML and
# inject their own scripts, which inflates LCP/TBT. Keep the version in sync with
# LIGHTHOUSE_VERSION in scripts/perf/lighthouse.ts.
#
#   docker build -t inex-lighthouse:13.5.0 -f scripts/perf/lighthouse.Dockerfile scripts/perf
#   PERF_LIGHTHOUSE_DOCKER_IMAGE=inex-lighthouse:13.5.0 pnpm tsx scripts/perf/lighthouse.ts
FROM node:22-bookworm
RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium fonts-dejavu-core \
  && rm -rf /var/lib/apt/lists/*
RUN npm i -g lighthouse@13.5.0
ENV CHROME_PATH=/usr/bin/chromium
ENTRYPOINT ["lighthouse"]

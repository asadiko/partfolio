FROM mcr.microsoft.com/playwright:v1.49.0-noble
WORKDIR /e2e
RUN npm init -y >/dev/null && npm install --silent playwright@1.49.0
COPY smoke.mjs .
CMD ["node", "smoke.mjs"]

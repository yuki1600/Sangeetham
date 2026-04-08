# Backend image for Render — Express + better-sqlite3 + ffmpeg.
#
# The image bakes the committed sangeetha.db (45 MB) and the Songs/ seed JSONs
# into the image so the service starts with the same data the repo has at HEAD.
# Render's free tier has no persistent disk; any edits made through the live app
# are lost on the next redeploy. To persist edits across deploys, add a Render
# disk and mount it at /app/server/data, or migrate the storage layer to a
# managed DB.

FROM node:20-bookworm-slim

# ffmpeg is needed by the /api/songs/convert-to-mp3 route.
# python3 + build-essential are needed for `better-sqlite3` to compile
# its native binding via node-gyp at install time.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ffmpeg \
        python3 \
        make \
        g++ \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install production deps. Copy only manifest files first so the layer is
# cacheable across code changes.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy the parts of the repo the server actually needs at runtime.
COPY server ./server
COPY shared ./shared
COPY Songs ./Songs
COPY PDFs ./PDFs

ENV NODE_ENV=production
# Render injects PORT at runtime; the server reads process.env.PORT.
EXPOSE 3001

CMD ["node", "server/index.js"]

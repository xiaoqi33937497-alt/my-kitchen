# Receipt reader service

Node 22 Web application for 火山引擎 veFaaS. It listens on `0.0.0.0:8000` and exposes `POST /v1/receipts/analyze` plus strict-origin `OPTIONS` preflight.

Required environment variables:

- `ARK_API_KEY` — configure only in veFaaS; never commit it.
- `ARK_MODEL_ID=doubao-seed-2-1-lite-260915`
- `ALLOWED_ORIGIN=https://xiaoqi33937497-alt.github.io`

Build with `pnpm build`. The deployment ZIP root must contain `dist/`, `package.json`, and LF-formatted `run.sh`. Use startup command `sh run.sh` (so ZIP permission metadata is irrelevant), port `8000`, and Node 22.

At API Gateway, disable automatic CORS, route `POST` and `OPTIONS` to this function, cap request bodies at 6 MiB, set low per-IP rate limits and maximum concurrency, and configure a verified global daily hard quota/automatic cutoff. Do not publish if a hard daily cutoff cannot be enforced. Disable request/response body logging and set a billing alert.

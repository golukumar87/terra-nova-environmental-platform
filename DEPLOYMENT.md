# Production Deployment

## Vercel

1. Push the project to a Git repository and import it into Vercel. The existing `vercel.json` sends API and dynamic page routes to the Express function while serving static files separately.
2. Add these environment variables in Vercel Project Settings for **Production** and **Preview** as appropriate:
   - `NODE_ENV=production`
   - `MONGODB_URI` set to the MongoDB Atlas connection string
   - `MONGODB_DB=terra-nova`
   - `JWT_SECRET` set to a unique, randomly generated secret (at least 32 random bytes)
   - `ADMIN_EMAIL` set to the initial administrator email
   - `ADMIN_PASSWORD` set to a unique strong password
   - `CERTIFICATE_SIGNING_SECRET` set to a separate random secret
   - `APP_URL` set to the canonical HTTPS site origin, without a trailing slash
   - `STRIPE_SECRET_KEY` from Stripe’s restricted live-mode API keys
   - `STRIPE_WEBHOOK_SECRET` from the endpoint configured for `https://<your-domain>/api/payments/webhook`
   - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from a Google OAuth web client
   - `GOOGLE_REDIRECT_URI` set exactly to `https://<your-domain>/api/auth/google/callback`
   - `GEMINI_API_KEY` only if the AI chat feature should use Gemini
   - `OPENAI_API_KEY` only if the AI chat feature should use OpenAI
3. In the Stripe Dashboard, configure webhook events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, and `invoice.paid`. Use test keys and test cards before switching to live mode.
4. In Google Cloud Console, add the exact callback URL above as an authorized redirect URI and configure the OAuth consent screen.
5. In MongoDB Atlas, allow network access from the deployment environment, create a database user with access only to this app database, and URL-encode special characters in its password.
6. Deploy with Vercel. Confirm `/`, `/campaigns`, `/campaign/<campaign-id>`, `/blog`, `/blog/<article-slug>`, `/stories`, `/stories/<story-slug>`, `/dashboard`, `/admin`, `/api/campaigns`, and `/api/auth/login` respond as expected.

The first server start creates the admin user only when `ADMIN_EMAIL` and `ADMIN_PASSWORD` are configured. Keep these values in the deployment secret store; do not commit `.env` or paste credentials into source files. Rotate any API key that has previously been committed or shared.

Donations remain unavailable until Stripe keys and webhook signing secret are configured. Checkout uses Stripe-hosted payment entry; campaign totals change only after signed payment events are received. Contribution receipts confirm payment and do not represent carbon credits or tax-deductibility. Google sign-in remains hidden until all three Google OAuth variables are configured.

## Local development and static preview

Run `npm run dev` in a terminal to start the API server on port 3000. If you use VS Code Live Server, open the HTML pages through its preview port (commonly 5500) while leaving the API server running. Local preview pages send API requests to port 3000; opening a page without the API server only allows its static content to load.

## Local production-mode smoke test

Copy `.env.example` to `.env`, use a reachable MongoDB instance, replace all placeholder secrets, then run:

```sh
npm install
npm start
```

The server deliberately refuses to start in production mode when `MONGODB_URI` or `JWT_SECRET` is missing. For local development, `npm run dev` keeps the local MongoDB defaults.

For local Stripe testing, run Stripe CLI forwarding to `http://localhost:3000/api/payments/webhook` and use its emitted webhook secret as `STRIPE_WEBHOOK_SECRET`. Use test-mode Stripe keys. Set up a Google OAuth web client with `http://localhost:3000/api/auth/google/callback` as an authorized redirect URI for local sign-in.

## Persistence notes

Vercel functions are stateless between invocations, so MongoDB is required for durable accounts, form submissions, and projects. The in-memory fallback is intended only for local demonstration and is not durable storage.

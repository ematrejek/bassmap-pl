# 10x Astro Starter

![](./public/template.png)

A modern, opinionated starter template for building fast, accessible web applications.

## Tech Stack

- [Astro](https://astro.build/) v6 - Modern web framework with server-first rendering
- [React](https://react.dev/) v19 - UI library for interactive components
- [TypeScript](https://www.typescriptlang.org/) v5 - Type-safe JavaScript
- [Tailwind CSS](https://tailwindcss.com/) v4 - Utility-first CSS framework
- [Supabase](https://supabase.com/) - Authentication and backend-as-a-service
- [Cloudflare Workers](https://workers.cloudflare.com/) - Edge deployment runtime

## Prerequisites

- Node.js v22.14.0 (as specified in `.nvmrc`)
- npm (comes with Node.js)

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com/przeprogramowani/10x-astro-starter.git
cd 10x-astro-starter
```

2. Install dependencies:

```bash
npm install
```

3. Set up Supabase and configure environment variables – see [Supabase Configuration](#supabase-configuration) below.

4. Create a `.dev.vars` file for local Cloudflare dev secrets:

```bash
cp .env.example .dev.vars
```

5. Run the development server:

```bash
npm run dev
```

## Available Scripts

- `npm run dev` - Start development server (Cloudflare workerd runtime)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint with type-checked rules
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run lint:all` - ESLint + em-dash check on docs
- `npm run format` - Run Prettier
- `npm test` - Vitest (see `tests/README.md` for Supabase setup)
- `npm run test:ci` - Full test gate (same as CI; requires Docker + `.env.test`)

## Project Structure

```md
.
├── src/
│ ├── layouts/ # Astro layouts
│ ├── pages/ # Astro pages
│ │ └── api/ # API endpoints
│ ├── components/ # UI components (Astro & React)
│ └── assets/ # Static assets
├── public/ # Public assets
├── wrangler.jsonc # Cloudflare Workers config
```

## Supabase Configuration

This project uses [Supabase](https://supabase.com/) for authentication. Environment variables are declared via Astro's `astro:env` schema and are treated as **server-only secrets** – they are never exposed to the client.

### First-time setup (local, no cloud project needed)

Requires [Docker](https://www.docker.com/) and ~7 GB RAM.

1. Create your `.env` file:

```bash
cp .env.example .env
```

2. Initialize the local Supabase project (creates a `supabase/` config folder):

```bash
npx supabase init
```

3. Start the local stack (downloads Docker images on first run):

```bash
npx supabase start
```

4. Copy the credentials printed by the CLI into your `.env` and `.dev.vars`:

```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_KEY=<anon key from CLI output>
```

5. To stop the stack when done:

```bash
npx supabase stop
```

The local Studio UI is available at `http://localhost:54323`.

6. Apply migrations and seed data (resets the local database):

```bash
npx supabase db reset
```

Database schema lives in `supabase/migrations/`; sample DnB events and a dev admin allowlist entry are in `supabase/seed.sql`. The dev admin email (`matrejekemilia@gmail.com`) is seeded in both files for local INSERT testing – replace it with your own email if you use a different Supabase Auth account.

### Using a cloud Supabase project instead

If you prefer to use a hosted Supabase project, add these variables to your `.env` and `.dev.vars` files:

| Variable       | Description                                                |
| -------------- | ---------------------------------------------------------- |
| `SUPABASE_URL` | Project URL from Supabase dashboard → Settings → API       |
| `SUPABASE_KEY` | `anon` public key from Supabase dashboard → Settings → API |

```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_KEY=<anon-key>
```

### Email confirmation in local development

By default Supabase requires email confirmation before a user can sign in. To skip this during local development:

1. Open the Supabase dashboard for your project
2. Go to **Authentication → Email → Confirm email**
3. Toggle it **off**

Users can then sign in immediately after sign-up without clicking a confirmation link.

### Auth routes

| Route                 | Description                                                             |
| --------------------- | ----------------------------------------------------------------------- |
| `/auth/signin`        | Email/password sign-in form                                             |
| `/auth/signup`        | Email/password sign-up form                                             |
| `/auth/confirm-email` | Post-signup "check your inbox" page                                     |
| `/dashboard`          | Example protected page (redirects to `/auth/signin` if unauthenticated) |

Route protection is handled in `src/middleware.ts`. Add paths to the `PROTECTED_ROUTES` array there to require authentication.

## Deployment

Produkcja: **https://bassmap.pl** (Cloudflare Worker `bassmap-pl`). Pełny plan operacyjny: [context/deployment/deploy-plan.md](context/deployment/deploy-plan.md).

### Migracje bazy produkcyjnej

Przed deployem kodu wymagającego schematu `events`:

```bash
npx supabase login
npx supabase link --project-ref dpqndrmvrkfahzyubrns
npx supabase db push
```

### Deploy aplikacji

Auto-deploy: każdy push/merge do gałęzi **`main`** uruchamia GitHub Actions (CI + Deploy).

Ręczny deploy:

```bash
npm run build
npx wrangler deploy
```

Sekrety runtime Workera: `SUPABASE_URL`, `SUPABASE_KEY` (`npx wrangler secret put` lub Dashboard).

### Smoke test prod (skrót)

- `/` – lista/mapа wydarzeń MVP
- `/auth/signin` – logowanie; brak banneru Supabase
- `/admin` – panel admina (tylko allowlist)
- `/events/[id]` – szczegóły wydarzenia

## CI

GitHub Actions runs **lint**, **`npm test`** (Vitest + local Supabase in Docker), and **build** on every push and PR to **`main`**. Deploy (`deploy.yml`) runs the same test gate before production build on push to `main`. Secrets: `SUPABASE_URL`, `SUPABASE_KEY` (build), `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

## License

MIT

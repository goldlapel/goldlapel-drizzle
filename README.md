# goldlapel-drizzle

Gold Lapel plugin for [Drizzle ORM](https://orm.drizzle.team/) — automatic Postgres query optimization with one line of code.

## Install

```bash
npm install goldlapel goldlapel-drizzle
```

## Quick start

### Option A: `drizzle()` (node-postgres driver)

Returns a wired Drizzle DB instance with the connection routed through Gold Lapel:

```javascript
import { drizzle } from 'goldlapel-drizzle'

const db = await drizzle()

const users = await db.select().from(usersTable)
```

Pass Drizzle options like `schema` and `logger` directly:

```javascript
import { drizzle } from 'goldlapel-drizzle'
import * as schema from './schema.js'

const db = await drizzle({ schema, logger: true })
```

### Option B: `init()` (any Drizzle driver)

Rewrites `DATABASE_URL` to point at the proxy. Works with any Drizzle driver — node-postgres, postgres.js, Neon, etc.:

```javascript
import { init } from 'goldlapel-drizzle'

await init()

// Now create Drizzle as usual — it reads the rewritten DATABASE_URL
import { drizzle } from 'drizzle-orm/node-postgres'
const db = drizzle(process.env.DATABASE_URL)
```

## Driver note

`drizzle()` uses `drizzle-orm/node-postgres` under the hood. If you use a different driver (postgres.js, Neon serverless, etc.), use `init()` instead — it rewrites `DATABASE_URL` and works with any driver.

## Options

Both `drizzle()` and `init()` accept an options object:

| Option | Description |
|--------|-------------|
| `url` | Upstream Postgres URL. Defaults to `process.env.DATABASE_URL`. |
| `port` | Port for the Gold Lapel proxy. Defaults to `7932`. |
| `extraArgs` | Array of extra CLI args passed to the Gold Lapel binary. |

`drizzle()` forwards all other options to `drizzle-orm/node-postgres`:

```javascript
const db = await drizzle({
  url: 'postgresql://user:pass@host:5432/mydb',
  port: 9000,
  extraArgs: ['--verbose'],
  schema,
  logger: true,
})
```

## Re-exports

For convenience, `goldlapel-drizzle` re-exports everything from `goldlapel`:

```javascript
import { start, stop, proxyUrl, GoldLapel } from 'goldlapel-drizzle'
```

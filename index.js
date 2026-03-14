import { start, stop, proxyUrl, GoldLapel } from 'goldlapel'

export async function drizzle(options = {}) {
    const url = options.url || process.env.DATABASE_URL
    if (!url) throw new Error('Gold Lapel: DATABASE_URL not set. Pass { url } or set DATABASE_URL.')
    const { url: _, port, config, extraArgs, _start, _drizzle, ...drizzleOptions } = options
    const startFn = _start || start
    const proxy = await startFn(url, { config, port, extraArgs })
    const drizzleFn = _drizzle || (await import('drizzle-orm/node-postgres')).drizzle
    return drizzleFn(proxy, drizzleOptions)
}

export async function init(options = {}) {
    const url = options.url || process.env.DATABASE_URL
    if (!url) throw new Error('Gold Lapel: DATABASE_URL not set. Pass { url } or set DATABASE_URL.')
    const startFn = options._start || start
    const proxy = await startFn(url, { config: options.config, port: options.port, extraArgs: options.extraArgs })
    process.env.DATABASE_URL = proxy
    return proxy
}

export { start, stop, proxyUrl, GoldLapel }

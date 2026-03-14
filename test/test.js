import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert'

import { drizzle, init, start, stop, proxyUrl, GoldLapel } from '../index.js'

function mockStart(returnUrl) {
    const calls = []
    async function _start(upstream, opts) {
        calls.push({ upstream, opts })
        return returnUrl
    }
    return { _start, calls }
}

function mockDrizzle() {
    const calls = []
    function _drizzle(url, options) {
        calls.push({ url, options })
        return { _mock: true, url, options }
    }
    return { _drizzle, calls }
}


describe('drizzle', () => {
    const origUrl = process.env.DATABASE_URL

    beforeEach(() => {
        delete process.env.DATABASE_URL
    })

    afterEach(() => {
        if (origUrl !== undefined) {
            process.env.DATABASE_URL = origUrl
        } else {
            delete process.env.DATABASE_URL
        }
    })

    it('calls start with DATABASE_URL and returns drizzle instance with proxy URL', async () => {
        process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/mydb'
        const { _start, calls } = mockStart('postgresql://user:pass@localhost:7932/mydb')
        const { _drizzle, calls: drizzleCalls } = mockDrizzle()

        const db = await drizzle({ _start, _drizzle })

        assert.strictEqual(calls.length, 1)
        assert.strictEqual(calls[0].upstream, 'postgresql://user:pass@host:5432/mydb')
        assert.deepStrictEqual(calls[0].opts, { config: undefined, port: undefined, extraArgs: undefined })
        assert.strictEqual(drizzleCalls.length, 1)
        assert.strictEqual(drizzleCalls[0].url, 'postgresql://user:pass@localhost:7932/mydb')
        assert.strictEqual(db._mock, true)
    })

    it('uses explicit url over env', async () => {
        process.env.DATABASE_URL = 'postgresql://env@host:5432/db'
        const { _start, calls } = mockStart('postgresql://user:pass@localhost:7932/mydb')
        const { _drizzle } = mockDrizzle()

        await drizzle({
            url: 'postgresql://explicit@host:5432/db',
            _start,
            _drizzle,
        })

        assert.strictEqual(calls[0].upstream, 'postgresql://explicit@host:5432/db')
    })

    it('throws when no DATABASE_URL', async () => {
        await assert.rejects(
            () => drizzle({ _start: mockStart('x')._start, _drizzle: mockDrizzle()._drizzle }),
            /DATABASE_URL not set/,
        )
    })

    it('passes port to start', async () => {
        process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/mydb'
        const { _start, calls } = mockStart('postgresql://user:pass@localhost:9000/mydb')
        const { _drizzle } = mockDrizzle()

        await drizzle({ port: 9000, _start, _drizzle })

        assert.strictEqual(calls[0].opts.port, 9000)
    })

    it('passes extraArgs to start', async () => {
        process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/mydb'
        const { _start, calls } = mockStart('postgresql://user:pass@localhost:7932/mydb')
        const { _drizzle } = mockDrizzle()

        await drizzle({
            extraArgs: ['--verbose'],
            _start,
            _drizzle,
        })

        assert.deepStrictEqual(calls[0].opts.extraArgs, ['--verbose'])
    })

    it('passes config to start', async () => {
        process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/mydb'
        const { _start, calls } = mockStart('postgresql://user:pass@localhost:7932/mydb')
        const { _drizzle } = mockDrizzle()

        await drizzle({
            config: { mode: 'butler', poolSize: 30, disableN1: true },
            _start,
            _drizzle,
        })

        assert.deepStrictEqual(calls[0].opts.config, { mode: 'butler', poolSize: 30, disableN1: true })
    })

    it('strips config from drizzle options', async () => {
        process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/mydb'
        const { _start } = mockStart('postgresql://user:pass@localhost:7932/mydb')
        const { _drizzle, calls: drizzleCalls } = mockDrizzle()

        await drizzle({
            config: { mode: 'butler' },
            schema: { users: 'mock' },
            _start,
            _drizzle,
        })

        assert.strictEqual(drizzleCalls[0].options.config, undefined)
        assert.deepStrictEqual(drizzleCalls[0].options, { schema: { users: 'mock' } })
    })

    it('forwards drizzle options and strips GL options', async () => {
        process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/mydb'
        const { _start } = mockStart('postgresql://user:pass@localhost:7932/mydb')
        const { _drizzle, calls: drizzleCalls } = mockDrizzle()

        await drizzle({
            schema: { users: 'mock' },
            logger: true,
            url: 'postgresql://user:pass@host:5432/mydb',
            port: 9000,
            config: { mode: 'butler' },
            extraArgs: ['--verbose'],
            _start,
            _drizzle,
        })

        assert.deepStrictEqual(drizzleCalls[0].options, { schema: { users: 'mock' }, logger: true })
    })

    it('returns instance from drizzle factory', async () => {
        process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/mydb'
        const { _start } = mockStart('postgresql://user:pass@localhost:7932/mydb')
        const { _drizzle } = mockDrizzle()

        const db = await drizzle({ _start, _drizzle })

        assert.strictEqual(db._mock, true)
        assert.strictEqual(db.url, 'postgresql://user:pass@localhost:7932/mydb')
    })
})


describe('init', () => {
    const origUrl = process.env.DATABASE_URL

    beforeEach(() => {
        delete process.env.DATABASE_URL
    })

    afterEach(() => {
        if (origUrl !== undefined) {
            process.env.DATABASE_URL = origUrl
        } else {
            delete process.env.DATABASE_URL
        }
    })

    it('rewrites process.env.DATABASE_URL to proxy URL', async () => {
        process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/mydb'
        const { _start } = mockStart('postgresql://user:pass@localhost:7932/mydb')

        await init({ _start })

        assert.strictEqual(process.env.DATABASE_URL, 'postgresql://user:pass@localhost:7932/mydb')
    })

    it('uses explicit url over env', async () => {
        process.env.DATABASE_URL = 'postgresql://env@host:5432/db'
        const { _start, calls } = mockStart('postgresql://explicit@localhost:7932/db')

        await init({ url: 'postgresql://explicit@host:5432/db', _start })

        assert.strictEqual(calls[0].upstream, 'postgresql://explicit@host:5432/db')
    })

    it('throws when no DATABASE_URL', async () => {
        await assert.rejects(
            () => init({ _start: mockStart('x')._start }),
            /DATABASE_URL not set/,
        )
    })

    it('returns the proxy URL', async () => {
        process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/mydb'
        const { _start } = mockStart('postgresql://user:pass@localhost:7932/mydb')

        const result = await init({ _start })

        assert.strictEqual(result, 'postgresql://user:pass@localhost:7932/mydb')
    })

    it('passes port to start', async () => {
        process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/mydb'
        const { _start, calls } = mockStart('postgresql://user:pass@localhost:9000/mydb')

        await init({ port: 9000, _start })

        assert.strictEqual(calls[0].opts.port, 9000)
    })

    it('passes extraArgs to start', async () => {
        process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/mydb'
        const { _start, calls } = mockStart('postgresql://user:pass@localhost:7932/mydb')

        await init({ extraArgs: ['--verbose'], _start })

        assert.deepStrictEqual(calls[0].opts.extraArgs, ['--verbose'])
    })

    it('passes config to start', async () => {
        process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/mydb'
        const { _start, calls } = mockStart('postgresql://user:pass@localhost:7932/mydb')

        await init({ config: { mode: 'butler', poolSize: 30, disableN1: true }, _start })

        assert.deepStrictEqual(calls[0].opts.config, { mode: 'butler', poolSize: 30, disableN1: true })
    })

    it('sets DATABASE_URL even when using explicit url', async () => {
        process.env.DATABASE_URL = 'postgresql://original@host:5432/db'
        const { _start } = mockStart('postgresql://explicit@localhost:7932/db')

        await init({ url: 'postgresql://explicit@host:5432/db', _start })

        assert.strictEqual(process.env.DATABASE_URL, 'postgresql://explicit@localhost:7932/db')
    })
})


describe('re-exports', () => {
    it('re-exports start from goldlapel', () => {
        assert.strictEqual(typeof start, 'function')
    })

    it('re-exports stop from goldlapel', () => {
        assert.strictEqual(typeof stop, 'function')
    })

    it('re-exports proxyUrl from goldlapel', () => {
        assert.strictEqual(typeof proxyUrl, 'function')
    })

    it('re-exports GoldLapel from goldlapel', () => {
        assert.strictEqual(typeof GoldLapel, 'function')
    })
})

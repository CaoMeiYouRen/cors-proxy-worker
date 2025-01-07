import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { Bindings } from '../types'
import logger from '@/middlewares/logger'

const app = new Hono<{ Bindings: Bindings }>()

app.all('*', async (c) => {
    const request = c.req.raw
    const url = new URL(c.req.url)
    const targetUrl = url.searchParams.get('targetUrl') || request.headers.get('x-target-url') || ''
    if (!targetUrl) {
        throw new HTTPException(400, { message: 'targetUrl is required' })
    }
    url.searchParams.delete('targetUrl')
    request.headers.delete('x-target-url')
    const newUrl = new URL(targetUrl)
    newUrl.search = url.search
    newUrl.pathname = url.pathname
    logger.info(`Proxying request to ${newUrl.toString()}`)
    const init: RequestInit = {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: request.redirect,
        credentials: request.credentials,
    }
    const response = await fetch(newUrl, init)
    c.status(response.status as any)
    logger.info(`Response status: ${response.status}`)
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
        return c.json(await response.json())
    }
    return c.text(await response.text())
})

export default app

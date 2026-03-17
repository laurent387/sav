import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'

const PORT = Number(process.env.AI_BACKEND_PORT || 8787)
const ALLOWED_ORIGIN = process.env.AI_BACKEND_ALLOWED_ORIGIN || '*'
const FLOWISE_BASE_URL = stripTrailingSlash(process.env.FLOWISE_BASE_URL || 'http://192.168.1.77:3002')
const FLOWISE_CHATFLOW_ID = process.env.FLOWISE_CHATFLOW_ID || ''
const FLOWISE_API_KEY = process.env.FLOWISE_API_KEY || ''
const MAX_BODY_SIZE = 1024 * 1024

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, '')
}

function setCorsHeaders(response) {
  response.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.setHeader('Vary', 'Origin')
}

function sendJson(response, statusCode, payload) {
  setCorsHeaders(response)
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.end(JSON.stringify(payload, null, 2))
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function extractJsonBlock(text) {
  const trimmed = text.trim()
  const direct = safeJsonParse(trimmed)
  if (direct) return direct

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced?.[1]) {
    const parsed = safeJsonParse(fenced[1].trim())
    if (parsed) return parsed
  }

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return safeJsonParse(trimmed.slice(firstBrace, lastBrace + 1))
  }

  return null
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : []
}

function normalizeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null
}

function buildPrompt(payload) {
  const {
    question,
    unit,
    history,
    workOrders,
    documents,
    technicianNotes,
  } = payload

  const safeUnit = normalizeObject(unit)
  const safeHistory = normalizeArray(history)
  const safeWorkOrders = normalizeArray(workOrders)
  const safeDocuments = normalizeArray(documents)
  const safeNotes = typeof technicianNotes === 'string' ? technicianNotes.trim() : ''

  return [
    'Tu es un assistant GMAO LIFT spécialisé en analyse d’historique unité.',
    'Réponds uniquement à partir du contexte fourni ci-dessous.',
    'Si une information manque, dis-le explicitement.',
    'Ne fabrique ni diagnostic certain, ni pièce, ni étape inexistante.',
    'Ta sortie doit être un JSON strict, sans markdown, avec cette forme :',
    '{"summary":"","probable_causes":[],"checks":[],"parts_to_review":[],"recommended_action":"","fnc_draft":"","confidence":"low|medium|high"}',
    '',
    'QUESTION UTILISATEUR :',
    question,
    '',
    'UNITÉ :',
    JSON.stringify(safeUnit, null, 2),
    '',
    'HISTORIQUE :',
    JSON.stringify(safeHistory, null, 2),
    '',
    'ORDRES DE TRAVAIL :',
    JSON.stringify(safeWorkOrders, null, 2),
    '',
    'DOCUMENTS ASSOCIÉS :',
    JSON.stringify(safeDocuments, null, 2),
    '',
    'NOTES TECHNICIEN :',
    safeNotes || 'Aucune note complémentaire.',
  ].join('\n')
}

function extractAnswerText(flowisePayload) {
  if (typeof flowisePayload === 'string') return flowisePayload
  if (!flowisePayload || typeof flowisePayload !== 'object') {
    return JSON.stringify(flowisePayload ?? null)
  }

  const candidates = [
    flowisePayload.text,
    flowisePayload.answer,
    flowisePayload.response,
    flowisePayload.message,
    flowisePayload.output,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate
    }
  }

  return JSON.stringify(flowisePayload)
}

async function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let raw = ''
    let size = 0

    request.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_SIZE) {
        reject(new Error('Request body too large'))
        request.destroy()
        return
      }
      raw += chunk.toString('utf8')
    })

    request.on('end', () => {
      const parsed = safeJsonParse(raw || '{}')
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        reject(new Error('Invalid JSON body'))
        return
      }
      resolve(parsed)
    })

    request.on('error', reject)
  })
}

function validateAnalyzePayload(payload) {
  if (typeof payload.question !== 'string' || !payload.question.trim()) {
    return 'Le champ "question" est obligatoire.'
  }
  return null
}

async function callFlowise(prompt, sessionId) {
  if (!FLOWISE_CHATFLOW_ID) {
    throw new Error('FLOWISE_CHATFLOW_ID is not configured')
  }

  const headers = {
    'Content-Type': 'application/json',
  }

  if (FLOWISE_API_KEY) {
    headers.Authorization = `Bearer ${FLOWISE_API_KEY}`
  }

  const response = await fetch(
    `${FLOWISE_BASE_URL}/api/v1/prediction/${FLOWISE_CHATFLOW_ID}`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        question: prompt,
        overrideConfig: {
          sessionId,
        },
      }),
    },
  )

  const raw = await response.text()
  const parsed = safeJsonParse(raw) ?? raw

  if (!response.ok) {
    const message =
      typeof parsed === 'string'
        ? parsed
        : JSON.stringify(parsed)

    throw new Error(`Flowise error ${response.status}: ${message}`)
  }

  return parsed
}

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)

  if (request.method === 'OPTIONS') {
    setCorsHeaders(response)
    response.statusCode = 204
    response.end()
    return
  }

  if (request.method === 'GET' && requestUrl.pathname === '/health') {
    sendJson(response, 200, {
      ok: true,
      service: 'ai-proxy',
      flowiseConfigured: Boolean(FLOWISE_CHATFLOW_ID),
      flowiseBaseUrl: FLOWISE_BASE_URL,
    })
    return
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/ai/unit-history/analyze') {
    try {
      const payload = await readJsonBody(request)
      const validationError = validateAnalyzePayload(payload)

      if (validationError) {
        sendJson(response, 400, {
          ok: false,
          error: validationError,
        })
        return
      }

      const sessionId =
        typeof payload.sessionId === 'string' && payload.sessionId.trim()
          ? payload.sessionId.trim()
          : randomUUID()

      const prompt = buildPrompt(payload)
      const flowisePayload = await callFlowise(prompt, sessionId)
      const answer = extractAnswerText(flowisePayload)
      const structured = extractJsonBlock(answer)

      sendJson(response, 200, {
        ok: true,
        sessionId,
        answer,
        structured,
      })
    } catch (error) {
      sendJson(response, 502, {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown AI proxy error',
      })
    }
    return
  }

  sendJson(response, 404, {
    ok: false,
    error: 'Route not found',
  })
})

server.listen(PORT, () => {
  console.log(`[ai-proxy] listening on http://localhost:${PORT}`)
  console.log(`[ai-proxy] Flowise base URL: ${FLOWISE_BASE_URL}`)
  console.log(
    `[ai-proxy] Chatflow configured: ${FLOWISE_CHATFLOW_ID ? 'yes' : 'no'}`,
  )
})

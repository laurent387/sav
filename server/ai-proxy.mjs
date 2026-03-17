import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import {
  DEFAULT_GAMMES_OUTPUT_DIR,
  searchGammesKnowledgeBase,
} from './gammes-kb.mjs'

const PORT = Number(process.env.AI_BACKEND_PORT || 8787)
const ALLOWED_ORIGIN = process.env.AI_BACKEND_ALLOWED_ORIGIN || '*'
const FLOWISE_BASE_URL = stripTrailingSlash(process.env.FLOWISE_BASE_URL || 'http://192.168.1.77:3002')
const FLOWISE_CHATFLOW_ID = process.env.FLOWISE_CHATFLOW_ID || ''
const FLOWISE_GAMMES_CHATFLOW_ID = process.env.FLOWISE_GAMMES_CHATFLOW_ID || FLOWISE_CHATFLOW_ID
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
  const trimmed = String(text || '').trim()
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

function validateQuestionPayload(payload) {
  if (typeof payload.question !== 'string' || !payload.question.trim()) {
    return 'Le champ "question" est obligatoire.'
  }
  return null
}

function buildUnitHistoryPrompt(payload) {
  const safeUnit = normalizeObject(payload.unit)
  const safeHistory = normalizeArray(payload.history)
  const safeWorkOrders = normalizeArray(payload.workOrders)
  const safeDocuments = normalizeArray(payload.documents)
  const safeNotes = typeof payload.technicianNotes === 'string' ? payload.technicianNotes.trim() : ''

  return [
    'Tu es un assistant GMAO LIFT specialise en analyse d historique unite.',
    'Reponds uniquement a partir du contexte fourni ci-dessous.',
    'Si une information manque, dis-le explicitement.',
    'Ne fabrique ni diagnostic certain, ni piece, ni etape inexistante.',
    'Ta sortie doit etre un JSON strict, sans markdown, avec cette forme :',
    '{"summary":"","probable_causes":[],"checks":[],"parts_to_review":[],"recommended_action":"","fnc_draft":"","confidence":"low|medium|high"}',
    '',
    'QUESTION UTILISATEUR :',
    payload.question,
    '',
    'UNITE :',
    JSON.stringify(safeUnit, null, 2),
    '',
    'HISTORIQUE :',
    JSON.stringify(safeHistory, null, 2),
    '',
    'ORDRES DE TRAVAIL :',
    JSON.stringify(safeWorkOrders, null, 2),
    '',
    'DOCUMENTS ASSOCIES :',
    JSON.stringify(safeDocuments, null, 2),
    '',
    'NOTES TECHNICIEN :',
    safeNotes || 'Aucune note complementaire.',
  ].join('\n')
}

function buildGammesPrompt(payload, retrieval) {
  const topChunks = retrieval.chunks.map((chunk) => ({
    source: chunk.metadata?.relativePath,
    title: chunk.metadata?.title,
    section: chunk.metadata?.section,
    discipline: chunk.metadata?.discipline,
    configs: chunk.metadata?.configs,
    segment: chunk.segmentLabel,
    text: chunk.text,
  }))

  return [
    'Tu es un assistant GMAO LIFT specialise dans les gammes et documents techniques.',
    'Reponds uniquement a partir du contexte de gammes fourni.',
    'Si la reponse n est pas presente dans les documents, dis le clairement.',
    'Ne melange pas plusieurs configurations si le contexte est ambigu.',
    'Ta sortie doit etre un JSON strict, sans markdown, avec cette forme :',
    '{"answer":"","sources":[],"warnings":[],"confidence":"low|medium|high"}',
    '',
    'QUESTION UTILISATEUR :',
    payload.question,
    '',
    'FILTRES :',
    JSON.stringify({
      configuration: payload.configuration || null,
      section: payload.section || null,
      discipline: payload.discipline || null,
    }, null, 2),
    '',
    'EXTRAITS DE GAMMES :',
    JSON.stringify(topChunks, null, 2),
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

async function callFlowise(prompt, sessionId, chatflowId) {
  if (!chatflowId) {
    throw new Error('Flowise chatflow is not configured')
  }

  const headers = {
    'Content-Type': 'application/json',
  }

  if (FLOWISE_API_KEY) {
    headers.Authorization = `Bearer ${FLOWISE_API_KEY}`
  }

  const response = await fetch(
    `${FLOWISE_BASE_URL}/api/v1/prediction/${chatflowId}`,
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
    const message = typeof parsed === 'string' ? parsed : JSON.stringify(parsed)
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
      flowiseGammesConfigured: Boolean(FLOWISE_GAMMES_CHATFLOW_ID),
      flowiseBaseUrl: FLOWISE_BASE_URL,
      gammesOutputDir: DEFAULT_GAMMES_OUTPUT_DIR,
    })
    return
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/ai/unit-history/analyze') {
    try {
      const payload = await readJsonBody(request)
      const validationError = validateQuestionPayload(payload)

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

      const prompt = buildUnitHistoryPrompt(payload)
      const flowisePayload = await callFlowise(prompt, sessionId, FLOWISE_CHATFLOW_ID)
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

  if (request.method === 'POST' && requestUrl.pathname === '/api/ai/gammes/search') {
    try {
      const payload = await readJsonBody(request)
      const validationError = validateQuestionPayload(payload)

      if (validationError) {
        sendJson(response, 400, {
          ok: false,
          error: validationError,
        })
        return
      }

      const retrieval = await searchGammesKnowledgeBase({
        question: payload.question,
        configuration: payload.configuration,
        section: payload.section,
        discipline: payload.discipline,
        limit: Number(payload.limit || 8),
      })

      sendJson(response, 200, {
        ok: true,
        documents: retrieval.documents,
        chunks: retrieval.chunks,
        manifest: retrieval.manifest,
      })
    } catch (error) {
      sendJson(response, 500, {
        ok: false,
        error: error instanceof Error ? error.message : 'Unable to search gammes knowledge base',
      })
    }
    return
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/ai/gammes/ask') {
    try {
      const payload = await readJsonBody(request)
      const validationError = validateQuestionPayload(payload)

      if (validationError) {
        sendJson(response, 400, {
          ok: false,
          error: validationError,
        })
        return
      }

      const retrieval = await searchGammesKnowledgeBase({
        question: payload.question,
        configuration: payload.configuration,
        section: payload.section,
        discipline: payload.discipline,
        limit: Number(payload.limit || 8),
      })

      const sessionId =
        typeof payload.sessionId === 'string' && payload.sessionId.trim()
          ? payload.sessionId.trim()
          : randomUUID()

      if (!FLOWISE_GAMMES_CHATFLOW_ID) {
        sendJson(response, 200, {
          ok: true,
          ready: false,
          sessionId,
          answer: null,
          structured: null,
          documents: retrieval.documents,
          chunks: retrieval.chunks,
          manifest: retrieval.manifest,
          warning: 'FLOWISE_GAMMES_CHATFLOW_ID is not configured',
        })
        return
      }

      const prompt = buildGammesPrompt(payload, retrieval)
      const flowisePayload = await callFlowise(prompt, sessionId, FLOWISE_GAMMES_CHATFLOW_ID)
      const answer = extractAnswerText(flowisePayload)
      const structured = extractJsonBlock(answer)

      sendJson(response, 200, {
        ok: true,
        ready: true,
        sessionId,
        answer,
        structured,
        documents: retrieval.documents,
        chunks: retrieval.chunks,
        manifest: retrieval.manifest,
      })
    } catch (error) {
      sendJson(response, 500, {
        ok: false,
        error: error instanceof Error ? error.message : 'Unable to ask gammes assistant',
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
  console.log(`[ai-proxy] Chatflow configured: ${FLOWISE_CHATFLOW_ID ? 'yes' : 'no'}`)
  console.log(`[ai-proxy] Gammes chatflow configured: ${FLOWISE_GAMMES_CHATFLOW_ID ? 'yes' : 'no'}`)
  console.log(`[ai-proxy] Gammes KB dir: ${DEFAULT_GAMMES_OUTPUT_DIR}`)
})

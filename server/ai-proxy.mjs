import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { loadProjectEnv } from './load-env.mjs'
import {
  DEFAULT_GAMMES_OUTPUT_DIR,
  searchGammesKnowledgeBase,
} from './gammes-kb.mjs'

loadProjectEnv()

const PORT = Number(process.env.AI_BACKEND_PORT || 8787)
const ALLOWED_ORIGIN = process.env.AI_BACKEND_ALLOWED_ORIGIN || '*'
const FLOWISE_BASE_URL = stripTrailingSlash(process.env.FLOWISE_BASE_URL || 'http://192.168.1.77:3002')
const FLOWISE_CHATFLOW_ID = process.env.FLOWISE_CHATFLOW_ID || ''
const FLOWISE_GAMMES_CHATFLOW_ID = process.env.FLOWISE_GAMMES_CHATFLOW_ID || FLOWISE_CHATFLOW_ID
const FLOWISE_API_KEY = process.env.FLOWISE_API_KEY || ''
const LITELLM_BASE_URL = stripTrailingSlash(process.env.LITELLM_BASE_URL || 'http://192.168.1.77:4000')
const LITELLM_API_KEY = process.env.LITELLM_API_KEY || ''
const LITELLM_MODEL = process.env.LITELLM_MODEL || 'fast'
const AI_PROVIDER_TIMEOUT_MS = Number(process.env.AI_PROVIDER_TIMEOUT_MS || 15000)
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

function truncateText(value, maxLength = 900) {
  const text = String(value || '').trim()
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength).trim()}...`
}

function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))]
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

function inferUnitHistoryParts(text) {
  const lowered = String(text || '').toLowerCase()
  const matches = []
  const patterns = [
    ['motorisation z', 'Motorisation Z'],
    ['partie mobile', 'Partie mobile'],
    ['partie fixe', 'Partie fixe'],
    ['fixation', 'Fixations'],
    ['frein', 'Frein'],
    ['tambour', 'Tambour'],
    ['rail', 'Rail'],
    ['roulement', 'Roulement'],
    ['chaine', 'Chaine'],
  ]

  for (const [needle, label] of patterns) {
    if (lowered.includes(needle)) {
      matches.push(label)
    }
  }

  return uniqueStrings(matches)
}

function inferUnitHistoryCauses(text) {
  const lowered = String(text || '').toLowerCase()
  const causes = []

  if (lowered.includes('vibration') || lowered.includes('vibre')) {
    causes.push('Jeu mecanique ou alignement a verifier sur les elements en mouvement')
  }
  if (lowered.includes('bruit') || lowered.includes('claquement')) {
    causes.push('Bruit anormal a corréler avec une fixation, un guidage ou un frottement')
  }
  if (lowered.includes('fixation') || lowered.includes('serrage')) {
    causes.push('Desserrage ou maintien insuffisant des fixations')
  }
  if (lowered.includes('fnc')) {
    causes.push('Anomalie deja constatee et non completement soldee')
  }

  if (!causes.length) {
    causes.push('Controle mecanique prioritaire a confirmer sur site')
  }

  return uniqueStrings(causes)
}

function buildUnitHistoryFallbackStructured(payload) {
  const safeUnit = normalizeObject(payload.unit) || {}
  const safeHistory = normalizeArray(payload.history)
  const safeWorkOrders = normalizeArray(payload.workOrders)
  const safeDocuments = normalizeArray(payload.documents)
  const safeNotes = typeof payload.technicianNotes === 'string' ? payload.technicianNotes.trim() : ''

  const latestEvents = [...safeHistory]
    .filter((event) => event && typeof event === 'object')
    .sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')))
    .slice(0, 4)

  const openWorkOrders = safeWorkOrders.filter((workOrder) => {
    const status = String(workOrder?.status || '')
    return !['termine', 'annule', 'cancelled', 'closed'].includes(status)
  })

  const latestEventText = latestEvents
    .map((event) => [event.title, event.detail].filter(Boolean).join(' - '))
    .join(' | ')

  const operationChecks = openWorkOrders
    .flatMap((workOrder) => normalizeArray(workOrder.operations).map((operation) => {
      const title = operation?.title || operation?.code || operation?.id
      const status = operation?.status ? ` (${operation.status})` : ''
      return title ? `${title}${status}` : ''
    }))

  const parts = uniqueStrings([
    ...safeDocuments.flatMap((document) => inferUnitHistoryParts(document)),
    ...inferUnitHistoryParts(latestEventText),
    ...inferUnitHistoryParts(safeNotes),
  ])

  const probableCauses = inferUnitHistoryCauses([
    payload.question,
    latestEventText,
    safeNotes,
    openWorkOrders.map((workOrder) => [workOrder.description, workOrder.notes].filter(Boolean).join(' ')).join(' '),
  ].join(' '))

  const checks = uniqueStrings([
    ...operationChecks,
    safeNotes ? `Valider sur site la note technicien: ${truncateText(safeNotes, 120)}` : '',
    latestEvents[0]?.detail ? `Recontroler le dernier symptome: ${truncateText(latestEvents[0].detail, 120)}` : '',
  ]).slice(0, 5)

  const summaryBits = uniqueStrings([
    safeUnit.id ? `Unite ${safeUnit.id}` : '',
    latestEvents[0]?.detail ? `dernier symptome: ${truncateText(latestEvents[0].detail, 140)}` : '',
    openWorkOrders[0]?.description ? `OT en cours: ${truncateText(openWorkOrders[0].description, 140)}` : '',
  ])

  const recommendedAction = openWorkOrders[0]?.description
    ? `Prioriser la cloture du controle en cours (${openWorkOrders[0].description}) puis confirmer ou infirmer les causes probables avant remplacement de piece.`
    : 'Planifier un controle cible sur les organes cites avant toute intervention corrective lourde.'

  const fncDraft = uniqueStrings([
    safeUnit.id ? `Unite ${safeUnit.id}` : '',
    latestEvents[0]?.detail || '',
    safeNotes || '',
  ]).join(' - ')

  return {
    summary: summaryBits.join(', ') || 'Aucun historique exploitable n a ete fourni.',
    probable_causes: probableCauses.slice(0, 4),
    checks,
    parts_to_review: parts.slice(0, 5),
    recommended_action: recommendedAction,
    fnc_draft: truncateText(fncDraft, 240),
    confidence: checks.length > 0 ? 'medium' : 'low',
  }
}

function buildGammesPrompt(payload, retrieval) {
  const topChunks = retrieval.chunks.map((chunk) => ({
    source: chunk.metadata?.relativePath,
    title: chunk.metadata?.title,
    section: chunk.metadata?.section,
    discipline: chunk.metadata?.discipline,
    configs: chunk.metadata?.configs,
    segment: chunk.segmentLabel,
    text: truncateText(chunk.text),
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

function buildGammesFallbackStructured(payload, retrieval) {
  const sources = retrieval.documents.slice(0, 5).map((document) => ({
    title: document.title,
    path: document.relativePath,
    configs: document.configs,
    section: document.section,
    discipline: document.discipline,
  }))

  const excerpts = retrieval.chunks.slice(0, 3).map((chunk) => {
    const source = chunk.metadata?.title || chunk.metadata?.relativePath || chunk.documentId
    return `[${source} / ${chunk.segmentLabel}] ${truncateText(chunk.text, 260)}`
  })

  const answer = excerpts.length > 0
    ? excerpts.join('\n\n')
    : 'Aucun extrait exploitable n a ete retrouve dans les gammes indexees.'

  const warnings = []
  if (!retrieval.documents.length) {
    warnings.push('Aucun document ne correspond aux filtres demandes.')
  }
  if (!payload.configuration) {
    warnings.push('Configuration non precisee : verifier manuellement la compatibilite avant application.')
  }

  return {
    answer,
    sources,
    warnings,
    confidence: retrieval.chunks.length > 0 ? 'medium' : 'low',
  }
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

function extractLiteLLMText(payload) {
  const content = payload?.choices?.[0]?.message?.content
  if (typeof content === 'string' && content.trim()) {
    return content
  }

  return extractAnswerText(payload)
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
      signal: AbortSignal.timeout(AI_PROVIDER_TIMEOUT_MS),
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

async function callLiteLLM(prompt, sessionId) {
  const headers = {
    'Content-Type': 'application/json',
  }

  if (LITELLM_API_KEY) {
    headers.Authorization = `Bearer ${LITELLM_API_KEY}`
  }

  const response = await fetch(
    `${LITELLM_BASE_URL}/v1/chat/completions`,
    {
      method: 'POST',
      signal: AbortSignal.timeout(AI_PROVIDER_TIMEOUT_MS),
      headers,
      body: JSON.stringify({
        model: LITELLM_MODEL,
        stream: false,
        temperature: 0.2,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        metadata: {
          sessionId,
          source: 'gmao-ai-proxy',
        },
      }),
    },
  )

  const raw = await response.text()
  const parsed = safeJsonParse(raw) ?? raw

  if (!response.ok) {
    const message = typeof parsed === 'string' ? parsed : JSON.stringify(parsed)
    throw new Error(`LiteLLM error ${response.status}: ${message}`)
  }

  return parsed
}

async function generateAnswer(prompt, sessionId, chatflowId) {
  let flowiseError = null

  if (chatflowId) {
    try {
      const flowisePayload = await callFlowise(prompt, sessionId, chatflowId)
      return {
        provider: 'flowise',
        raw: flowisePayload,
        answer: extractAnswerText(flowisePayload),
      }
    } catch (error) {
      flowiseError = error
    }
  }

  if (LITELLM_BASE_URL) {
    const litellmPayload = await callLiteLLM(prompt, sessionId)
    return {
      provider: flowiseError ? 'litellm-fallback' : 'litellm',
      raw: litellmPayload,
      answer: extractLiteLLMText(litellmPayload),
    }
  }

  if (flowiseError) {
    throw flowiseError
  }

  throw new Error('No AI provider configured. Configure Flowise or LiteLLM.')
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
      litellmConfigured: Boolean(LITELLM_BASE_URL),
      litellmAuthenticated: Boolean(LITELLM_API_KEY),
      litellmBaseUrl: LITELLM_BASE_URL,
      litellmModel: LITELLM_MODEL,
      aiProviderTimeoutMs: AI_PROVIDER_TIMEOUT_MS,
      defaultProvider: FLOWISE_CHATFLOW_ID ? 'flowise' : (LITELLM_BASE_URL ? 'litellm' : null),
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
      let completion
      let answer
      let structured
      let warning = null

      try {
        completion = await generateAnswer(prompt, sessionId, FLOWISE_CHATFLOW_ID)
        answer = completion.answer
        structured = extractJsonBlock(answer)
      } catch (error) {
        warning = error instanceof Error ? error.message : 'AI provider unavailable'
        structured = buildUnitHistoryFallbackStructured(payload)
        answer = JSON.stringify(structured, null, 2)
        completion = {
          provider: 'rules-fallback',
        }
      }

      sendJson(response, 200, {
        ok: true,
        sessionId,
        provider: completion.provider,
        answer,
        structured,
        ...(warning ? { warning } : {}),
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
        const structured = buildGammesFallbackStructured(payload, retrieval)
        sendJson(response, 200, {
          ok: true,
          ready: true,
          sessionId,
          provider: 'retrieval-fallback',
          answer: structured.answer,
          structured,
          documents: retrieval.documents,
          chunks: retrieval.chunks,
          manifest: retrieval.manifest,
        })
        return
      }

      const prompt = buildGammesPrompt(payload, retrieval)
      const completion = await generateAnswer(prompt, sessionId, FLOWISE_GAMMES_CHATFLOW_ID)
      const answer = completion.answer
      const structured = extractJsonBlock(answer)

      sendJson(response, 200, {
        ok: true,
        ready: true,
        sessionId,
        provider: completion.provider,
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
  console.log(`[ai-proxy] LiteLLM base URL: ${LITELLM_BASE_URL}`)
  console.log(`[ai-proxy] LiteLLM model: ${LITELLM_MODEL}`)
  console.log(`[ai-proxy] Gammes KB dir: ${DEFAULT_GAMMES_OUTPUT_DIR}`)
})

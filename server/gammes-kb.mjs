import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadProjectEnv } from './load-env.mjs'

loadProjectEnv()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

export const DEFAULT_GAMMES_SOURCE_DIR = process.env.GAMMES_SOURCE_DIR
  || path.resolve(projectRoot, '..', 'OneDrive_2026-03-16', "104_GAMME D'ASSEMBLAGE")

export const DEFAULT_GAMMES_OUTPUT_DIR = process.env.GAMMES_OUTPUT_DIR
  || path.resolve(projectRoot, 'server', 'generated', 'gammes-kb')

export function getGammesOutputPaths(outputDir = DEFAULT_GAMMES_OUTPUT_DIR) {
  return {
    outputDir,
    documentsPath: path.join(outputDir, 'documents.json'),
    chunksPath: path.join(outputDir, 'chunks.json'),
    manifestPath: path.join(outputDir, 'manifest.json'),
  }
}

let cache = {
  signature: '',
  value: null,
}

async function fileSignature(filePath) {
  const stat = await fs.stat(filePath)
  return `${filePath}:${stat.size}:${stat.mtimeMs}`
}

async function loadJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8')
  return JSON.parse(raw)
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function tokenize(value) {
  return normalizeText(value)
    .split(/\s+/)
    .filter((token) => token.length >= 3)
}

function matchesFilter(value, expected) {
  if (!expected) return true
  if (!value) return false

  if (Array.isArray(value)) {
    return value.some((entry) => normalizeText(entry) === normalizeText(expected))
  }

  return normalizeText(value) === normalizeText(expected)
}

export async function loadGammesKnowledgeBase(outputDir = DEFAULT_GAMMES_OUTPUT_DIR) {
  const paths = getGammesOutputPaths(outputDir)
  const signature = [
    await fileSignature(paths.documentsPath),
    await fileSignature(paths.chunksPath),
    await fileSignature(paths.manifestPath),
  ].join('|')

  if (cache.signature === signature && cache.value) {
    return cache.value
  }

  const [documents, chunks, manifest] = await Promise.all([
    loadJson(paths.documentsPath),
    loadJson(paths.chunksPath),
    loadJson(paths.manifestPath),
  ])

  cache = {
    signature,
    value: { documents, chunks, manifest, paths },
  }

  return cache.value
}

function scoreChunk(chunk, tokens) {
  const haystack = normalizeText([
    chunk.text,
    chunk.preview,
    chunk.metadata?.title,
    chunk.metadata?.fileName,
    ...(chunk.metadata?.keywords || []),
  ].join(' '))

  let score = 0
  for (const token of tokens) {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const matches = haystack.match(new RegExp(`\\b${escaped}\\b`, 'g'))
    if (matches?.length) {
      score += matches.length
    }
  }

  if (chunk.metadata?.documentType === 'gamme') {
    score += 2
  }

  return score
}

export async function searchGammesKnowledgeBase(options = {}) {
  const {
    question = '',
    configuration,
    section,
    discipline,
    limit = 8,
    outputDir = DEFAULT_GAMMES_OUTPUT_DIR,
  } = options

  const kb = await loadGammesKnowledgeBase(outputDir)
  const tokens = tokenize(question)

  const filteredChunks = kb.chunks.filter((chunk) => {
    const metadata = chunk.metadata || {}

    if (!matchesFilter(metadata.configs, configuration)) return false
    if (!matchesFilter(metadata.section, section)) return false
    if (!matchesFilter(metadata.discipline, discipline)) return false

    return true
  })

  const rankedChunks = filteredChunks
    .map((chunk) => ({
      ...chunk,
      score: scoreChunk(chunk, tokens),
    }))
    .filter((chunk) => chunk.score > 0 || tokens.length === 0)
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
    .slice(0, limit)

  const fallbackChunks = rankedChunks.length
    ? rankedChunks
    : filteredChunks.slice(0, limit).map((chunk) => ({ ...chunk, score: 0 }))

  const documentIds = new Set(fallbackChunks.map((chunk) => chunk.documentId))
  const documents = kb.documents.filter((document) => documentIds.has(document.id))

  return {
    manifest: kb.manifest,
    documents,
    chunks: fallbackChunks,
  }
}

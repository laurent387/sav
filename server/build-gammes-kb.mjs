import fs from 'node:fs/promises'
import path from 'node:path'
import unzipper from 'unzipper'
import { PDFExtract } from 'pdf.js-extract'
import { loadProjectEnv } from './load-env.mjs'
import {
  DEFAULT_GAMMES_OUTPUT_DIR,
  DEFAULT_GAMMES_SOURCE_DIR,
  getGammesOutputPaths,
} from './gammes-kb.mjs'

loadProjectEnv()

const SUPPORTED_EXTENSIONS = new Set(['.pptx', '.docx', '.xlsx', '.pdf'])
const pdfExtract = new PDFExtract()

function slugify(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function normalizeText(value) {
  return String(value || '')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/\u0000/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function decodeXmlEntities(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, number) => String.fromCodePoint(Number.parseInt(number, 10)))
}

function stripXml(xml) {
  return normalizeText(
    decodeXmlEntities(xml)
      .replace(/<\/(a:p|w:p|si|row|sheetData|text:p|txbxContent)>/g, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
}

async function walkFiles(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const nextPath = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      files.push(...await walkFiles(nextPath))
      continue
    }

    if (SUPPORTED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(nextPath)
    }
  }

  return files
}

async function openZipEntries(filePath, matcher) {
  const directory = await unzipper.Open.file(filePath)
  return directory.files
    .filter((entry) => matcher(entry.path))
    .sort((left, right) => left.path.localeCompare(right.path))
}

async function extractPptx(filePath) {
  const slides = await openZipEntries(filePath, (entryPath) => /^ppt\/slides\/slide\d+\.xml$/i.test(entryPath))
  const segments = []

  for (const slide of slides) {
    const slideNumber = slide.path.match(/slide(\d+)\.xml/i)?.[1] || '0'
    const text = stripXml((await slide.buffer()).toString('utf8'))
    if (text) {
      segments.push({
        label: `slide-${slideNumber}`,
        text,
      })
    }
  }

  return segments
}

async function extractDocx(filePath) {
  const entries = await openZipEntries(
    filePath,
    (entryPath) => /^word\/(document|header\d+|footer\d+|footnotes|endnotes)\.xml$/i.test(entryPath),
  )

  const texts = []
  for (const entry of entries) {
    const text = stripXml((await entry.buffer()).toString('utf8'))
    if (text) texts.push(text)
  }

  return texts.length
    ? [{ label: 'document', text: normalizeText(texts.join('\n\n')) }]
    : []
}

async function extractXlsx(filePath) {
  const entries = await openZipEntries(
    filePath,
    (entryPath) => /^xl\/(sharedStrings|workbook|worksheets\/sheet\d+)\.xml$/i.test(entryPath),
  )

  const segments = []
  for (const entry of entries) {
    const text = stripXml((await entry.buffer()).toString('utf8'))
    if (text) {
      segments.push({
        label: path.basename(entry.path, '.xml'),
        text,
      })
    }
  }

  return segments
}

async function extractPdf(filePath) {
  const data = await pdfExtract.extract(filePath, {})
  return data.pages
    .map((page, index) => ({
      label: `page-${index + 1}`,
      text: normalizeText(page.content.map((item) => item.str).join(' ')),
    }))
    .filter((segment) => segment.text)
}

async function extractSegments(filePath) {
  const extension = path.extname(filePath).toLowerCase()

  if (extension === '.pptx') return extractPptx(filePath)
  if (extension === '.docx') return extractDocx(filePath)
  if (extension === '.xlsx') return extractXlsx(filePath)
  if (extension === '.pdf') return extractPdf(filePath)

  return []
}

function detectConfigs(text) {
  const upper = text.toUpperCase()
  const configs = new Set()

  if (upper.includes("E'")) configs.add("E'")

  for (const config of ['F', 'G', 'H', 'I']) {
    const regex = new RegExp(`\\bCONF\\s*${config}\\b|\\b${config}\\b`, 'i')
    if (regex.test(upper)) {
      configs.add(config)
    }
  }

  return Array.from(configs)
}

function containsAny(text, words) {
  return words.some((word) => text.includes(word))
}

function guessSection(text) {
  if (containsAny(text, [
    'PARTIE FIXE', 'P.FIXE', 'CHASSIS FIXE', 'GOULOTTE',
    'MOTORISATION R', 'RETOURNEMENT PARTIE FIXE',
  ])) {
    return 'PARTIE FIXE'
  }

  if (containsAny(text, [
    'PARTIE MOBILE', 'HANDRAIL', 'BMP', 'LINING', 'MOTORISATION Z',
    'BORD SENSIBLE', 'DEMI LUNES', 'ROTATION', 'LEVAGE', 'GALETS',
    'OBTURATEUR', 'CAPTEURS', 'ELEVATION',
  ])) {
    return 'PARTIE MOBILE'
  }

  return null
}

function guessDiscipline(text) {
  if (containsAny(text, ['ELEC', 'HARNAIS', 'COFFRET', 'BORD SENSIBLE', 'GOULOTTE', 'CAPTEUR'])) {
    return 'ELEC'
  }

  if (containsAny(text, ['MECA', 'MOTORISATION', 'STRUCTURE', 'CHASSIS', 'GALET', 'RIVETEE', 'SOUFFLET'])) {
    return 'MECA'
  }

  return null
}

function guessDocumentType(text) {
  if (containsAny(text, ['PLAN DE LEVAGE', 'ELINGAGE'])) return 'plan'
  if (containsAny(text, ['GUIDE'])) return 'guide'
  if (containsAny(text, ['RETROFIT'])) return 'retrofit'
  if (containsAny(text, ['TEMPLATE'])) return 'template'
  if (containsAny(text, ['LISTE'])) return 'liste'
  if (containsAny(text, ['SUIVI'])) return 'suivi'
  if (containsAny(text, ['GAMME'])) return 'gamme'
  return 'document'
}

function buildKeywords(text) {
  const stopWords = new Set([
    'CONF', 'REV', 'PARTIE', 'MOBILE', 'FIXE', 'LIFT', 'ALSTOM', 'GAMME',
    'ASSEMBLAGE', 'MONTAGE', 'DE', 'DU', 'DES', 'ET', 'LA', 'LE',
  ])

  return Array.from(new Set(
    text
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/[^A-Z0-9']+/)
      .filter((token) => token.length >= 3 && !stopWords.has(token)),
  )).slice(0, 16)
}

function chunkText(text, size = 1200, overlap = 200) {
  if (!text) return []
  if (text.length <= size) return [text]

  const chunks = []
  let start = 0

  while (start < text.length) {
    let end = Math.min(text.length, start + size)
    if (end < text.length) {
      const slice = text.slice(start, end)
      const lastBreak = Math.max(slice.lastIndexOf('\n'), slice.lastIndexOf('. '))
      if (lastBreak >= 300) {
        end = start + lastBreak + 1
      }
    }

    const chunk = normalizeText(text.slice(start, end))
    if (chunk) chunks.push(chunk)
    if (end >= text.length) break
    start = Math.max(end - overlap, start + 1)
  }

  return chunks
}

async function buildDocumentRecord(sourceDir, filePath) {
  const relativePath = path.relative(sourceDir, filePath)
  const extension = path.extname(filePath).toLowerCase()
  const baseName = path.basename(filePath, extension)
  const upperName = relativePath.toUpperCase()
  const segments = await extractSegments(filePath)
  const allText = normalizeText(segments.map((segment) => segment.text).join('\n\n'))
  const id = slugify(relativePath)

  const metadata = {
    title: baseName,
    fileName: path.basename(filePath),
    relativePath,
    extension,
    documentType: guessDocumentType(upperName),
    section: guessSection(upperName),
    discipline: guessDiscipline(upperName),
    configs: detectConfigs(upperName),
    keywords: buildKeywords(upperName),
  }

  const chunks = []
  for (const segment of segments) {
    const segmentChunks = chunkText(segment.text)
    segmentChunks.forEach((text, index) => {
      chunks.push({
        id: `${id}:${segment.label}:${index + 1}`,
        documentId: id,
        segmentLabel: segment.label,
        text,
        preview: text.slice(0, 220),
        metadata,
      })
    })
  }

  return {
    document: {
      id,
      ...metadata,
      textLength: allText.length,
      segmentCount: segments.length,
      chunkCount: chunks.length,
      preview: allText.slice(0, 320),
    },
    chunks,
  }
}

async function ensureOutputDir(outputDir) {
  await fs.mkdir(outputDir, { recursive: true })
}

async function main() {
  const sourceDir = path.resolve(DEFAULT_GAMMES_SOURCE_DIR)
  const outputDir = path.resolve(DEFAULT_GAMMES_OUTPUT_DIR)
  const paths = getGammesOutputPaths(outputDir)

  await ensureOutputDir(outputDir)

  const files = await walkFiles(sourceDir)
  const documents = []
  const chunks = []
  const errors = []

  for (const filePath of files) {
    try {
      const { document, chunks: nextChunks } = await buildDocumentRecord(sourceDir, filePath)
      documents.push(document)
      chunks.push(...nextChunks)
      console.log(`[gammes:build] ${document.relativePath} -> ${nextChunks.length} chunks`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push({ filePath, message })
      console.warn(`[gammes:build] failed: ${filePath} -> ${message}`)
    }
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    sourceDir,
    outputDir,
    documentCount: documents.length,
    chunkCount: chunks.length,
    errorCount: errors.length,
    documentsByType: documents.reduce((accumulator, document) => {
      const key = document.documentType || 'unknown'
      accumulator[key] = (accumulator[key] || 0) + 1
      return accumulator
    }, {}),
    errors,
  }

  await Promise.all([
    fs.writeFile(paths.documentsPath, JSON.stringify(documents, null, 2)),
    fs.writeFile(paths.chunksPath, JSON.stringify(chunks, null, 2)),
    fs.writeFile(paths.manifestPath, JSON.stringify(manifest, null, 2)),
  ])

  console.log(`[gammes:build] documents: ${documents.length}`)
  console.log(`[gammes:build] chunks: ${chunks.length}`)
  console.log(`[gammes:build] errors: ${errors.length}`)
  console.log(`[gammes:build] output: ${outputDir}`)
}

main().catch((error) => {
  console.error('[gammes:build] fatal error')
  console.error(error)
  process.exit(1)
})

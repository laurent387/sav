import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
let alreadyLoaded = false

function stripInlineComment(value) {
  let quoted = false
  let quoteChar = ''

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index]
    const previous = value[index - 1]

    if ((char === '"' || char === "'") && previous !== '\\') {
      if (!quoted) {
        quoted = true
        quoteChar = char
      } else if (quoteChar === char) {
        quoted = false
        quoteChar = ''
      }
    }

    if (char === '#' && !quoted) {
      return value.slice(0, index).trim()
    }
  }

  return value.trim()
}

function unquote(value) {
  if (!value) return ''

  if (
    (value.startsWith('"') && value.endsWith('"'))
    || (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value
      .slice(1, -1)
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
  }

  return value
}

function parseEnvFile(raw) {
  const entries = []

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (!match) continue

    const [, key, rawValue] = match
    entries.push([key, unquote(stripInlineComment(rawValue))])
  }

  return entries
}

export function loadProjectEnv({ override = false } = {}) {
  if (alreadyLoaded && !override) return []

  const files = [
    path.join(projectRoot, '.env'),
    path.join(projectRoot, '.env.local'),
  ]

  const loadedFiles = []

  for (const filePath of files) {
    if (!fs.existsSync(filePath)) continue

    const entries = parseEnvFile(fs.readFileSync(filePath, 'utf8'))

    for (const [key, value] of entries) {
      if (override || process.env[key] === undefined) {
        process.env[key] = value
      }
    }

    loadedFiles.push(filePath)
  }

  alreadyLoaded = true
  return loadedFiles
}

export { projectRoot }

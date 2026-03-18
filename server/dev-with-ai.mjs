import { spawn } from 'node:child_process'
import process from 'node:process'

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const children = []
let shuttingDown = false

function shutdown(exitCode = 0) {
  if (shuttingDown) return
  shuttingDown = true

  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGTERM')
    }
  }

  setTimeout(() => process.exit(exitCode), 150)
}

function start(name, args) {
  const child = spawn(npmCommand, args, {
    stdio: 'inherit',
    env: process.env,
  })

  child.on('exit', (code, signal) => {
    if (signal || code === 0 || shuttingDown) return
    console.error(`[dev:ai] ${name} exited with code ${code}`)
    shutdown(code ?? 1)
  })

  children.push(child)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

start('ai:server:dev', ['run', 'ai:server:dev'])
start('dev', ['run', 'dev'])

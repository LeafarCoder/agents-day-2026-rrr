import { spawnSync } from 'node:child_process'

const isNestedAdapterBuild = process.env.TRAVELDNA_NEXT_ON_PAGES_BUILD === '1'
const isVercelBuild = Boolean(process.env.VERCEL || process.env.NOW_BUILDER)
const args = isNestedAdapterBuild || isVercelBuild ? ['next', 'build'] : ['@cloudflare/next-on-pages@1']
const env = { ...process.env, TRAVELDNA_NEXT_ON_PAGES_BUILD: '1' }

const result = spawnSync('npx', args, { env, stdio: 'inherit', shell: process.platform === 'win32' })
process.exit(result.status ?? 1)

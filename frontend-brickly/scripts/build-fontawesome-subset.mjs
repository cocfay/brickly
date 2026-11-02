#!/usr/bin/env node
/**
 * Genera un subconjunto local de Font Awesome Pro 7 con SOLO los iconos y
 * estilos que la aplicación usa.
 *
 * Uso:
 *   npm run icons:build
 *
 * - Lee los CSS oficiales de `scripts/fontawesome-source` (kit Pro 7.2.0).
 * - Escanea `src` buscando clases `fa-*`.
 * - Escribe `src/assets/fontawesome/css/fontawesome-subset.css`.
 * - Solo se necesitan las fuentes de `src/assets/fontawesome/webfonts`.
 *
 * Si se agrega un icono nuevo en el código, basta con volver a ejecutar el
 * script para que quede incluido en el subconjunto.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const srcDir = path.join(root, 'src')
const sourceDir = path.join(__dirname, 'fontawesome-source')
const outFile = path.join(srcDir, 'assets', 'fontawesome', 'css', 'fontawesome-subset.css')

// CSS oficiales que definen los iconos. fontawesome.css contiene los
// codepoints de los estilos clásicos (solid/regular/thin/sharp/duotone) y
// brands.css los de las marcas.
const ICON_SOURCE_FILES = ['fontawesome.css', 'brands.css']

// CSS oficiales que aportan @font-face, variables y familias.
const STYLE_SOURCE_FILES = [
  'fontawesome.css',
  'solid.css',
  'regular.css',
  'brands.css',
  'thin.css',
  'duotone.css',
  'sharp-light.css',
  'sharp-regular.css',
  'sharp-solid.css',
]

// Clases que cambian familia o tamaño, no son iconos.
const FAMILY_TOKENS = new Set([
  'solid', 'semibold', 'regular', 'light', 'thin', 'brands', 'classic',
  'duotone', 'sharp', 'sharp-duotone', 'chisel', 'etch', 'graphite', 'jelly',
  'jelly-duo', 'jelly-fill', 'notdog', 'notdog-duo', 'slab', 'slab-press',
  'thumbprint', 'utility', 'utility-duo', 'utility-fill', 'whiteboard',
])

const MODIFIER_TOKENS = new Set([
  '2xs', 'xs', 'sm', 'lg', '2xl', '1x', '2x', '3x', '4x', '5x', '6x', '7x',
  '8x', '9x', '10x', 'fw', 'ul', 'li', 'border', 'pull-left', 'pull-start',
  'pull-right', 'pull-end', 'beat', 'bounce', 'fade', 'beat-fade', 'flip',
  'flip-horizontal', 'flip-vertical', 'flip-both', 'shake', 'spin',
  'spin-reverse', 'pulse', 'spin-pulse', 'rotate-90', 'rotate-180',
  'rotate-270', 'rotate-by', 'stack', 'stack-1x', 'stack-2x', 'inverse',
  'swap-opacity',
])

// Iconos que el escaneo no puede detectar porque el nombre se arma con
// template strings (ej. `fa-chevron-${...}`).
const EXTRA_ICONS = ['chevron-down', 'chevron-right', 'eye', 'eye-slash']

// Tokens encontrados en el código (incluye familias) para decidir alias.
const FOUND_TOKENS = new Set()

// Estilos Pro que no vienen en el kit local (Graphite/Jelly no incluyen
// webfonts). Se aliasan a la familia clásica para que sigan renderizando.
const FAMILY_ALIASES = {
  'fa-graphite': 'classic',
  'fa-jelly': 'classic',
}

function readSource(file) {
  return fs.readFileSync(path.join(sourceDir, file), 'utf8')
}

/** Quita comentarios CSS respetando strings. */
function stripComments(css) {
  let out = ''
  let inString = null
  for (let i = 0; i < css.length; i++) {
    const ch = css[i]
    if (inString) {
      out += ch
      if (ch === '\\') {
        out += css[i + 1] ?? ''
        i++
      } else if (ch === inString) {
        inString = null
      }
      continue
    }
    if (ch === '"' || ch === "'") {
      inString = ch
      out += ch
      continue
    }
    if (ch === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2)
      i = end === -1 ? css.length : end + 1
      continue
    }
    out += ch
  }
  return out
}

/** Divide un CSS en reglas de primer nivel. */
function parseRules(css) {
  const rules = []
  let depth = 0
  let ruleStart = 0
  let inString = null

  for (let i = 0; i < css.length; i++) {
    const ch = css[i]
    if (inString) {
      if (ch === '\\') i++
      else if (ch === inString) inString = null
      continue
    }
    if (ch === '"' || ch === "'") {
      inString = ch
      continue
    }
    if (ch === '{') {
      depth++
      continue
    }
    if (ch === '}') {
      depth--
      if (depth === 0) {
        const text = css.slice(ruleStart, i + 1).trim()
        if (text) {
          const brace = text.indexOf('{')
          rules.push({
            prelude: text.slice(0, brace).trim(),
            body: text.slice(brace + 1, -1),
            text,
          })
        }
        ruleStart = i + 1
      }
    }
  }
  return rules
}

/** Una regla de icono solo declara `--fa: "..."`. */
function isIconRule(rule) {
  return !rule.prelude.startsWith('@') && /^\s*--fa\s*:/.test(rule.body)
}

function iconNamesFromRule(rule) {
  return [...rule.prelude.matchAll(/\.fa-([a-z0-9-]+)/g)].map((m) => m[1])
}

function normalizeRule(rule) {
  return `${rule.prelude}{${rule.body.replace(/\s+/g, ' ').trim()}}`
}

function walk(dir) {
  const files = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walk(full))
    else files.push(full)
  }
  return files
}

function collectUsedIcons() {
  const used = new Set()
  const scanned = /\.(jsx?|tsx?|html|json)$/i
  const faRe = /\bfa-([a-z0-9-]+)/g

  for (const file of walk(srcDir)) {
    if (!scanned.test(file)) continue
    if (file.includes(`${path.sep}assets${path.sep}fontawesome${path.sep}`)) continue
    const content = fs.readFileSync(file, 'utf8')
    for (const match of content.matchAll(faRe)) {
      const token = match[1]
      if (token.endsWith('-')) continue
      FOUND_TOKENS.add(token)
      if (FAMILY_TOKENS.has(token) || MODIFIER_TOKENS.has(token)) continue
      used.add(token)
    }
  }

  for (const icon of EXTRA_ICONS) used.add(icon)
  return used
}

function buildIconMap() {
  const map = new Map()
  for (const file of ICON_SOURCE_FILES) {
    const rules = parseRules(stripComments(readSource(file)))
    for (const rule of rules) {
      if (!isIconRule(rule)) continue
      for (const name of iconNamesFromRule(rule)) {
        if (!map.has(name)) map.set(name, rule)
      }
    }
  }
  return map
}

function buildFamilyCss() {
  const seen = new Set()
  const blocks = []

  for (const file of STYLE_SOURCE_FILES) {
    const rules = parseRules(stripComments(readSource(file)))
    const css = rules
      .filter((rule) => !isIconRule(rule))
      .map(normalizeRule)
      .filter((rule) => {
        if (seen.has(rule)) return false
        seen.add(rule)
        return true
      })

    if (css.length) {
      blocks.push(`/* ${file} */\n${css.join('\n')}`)
    }
  }

  return blocks.join('\n\n')
}

function main() {
  const iconMap = buildIconMap()
  const used = collectUsedIcons()

  const available = [...used].filter((name) => iconMap.has(name)).sort()
  const missing = [...used].filter((name) => !iconMap.has(name)).sort()

  const iconCss = []
  const emitted = new Set()
  for (const name of available) {
    const rule = iconMap.get(name)
    const key = normalizeRule(rule)
    if (emitted.has(key)) continue
    emitted.add(key)
    iconCss.push(rule.text)
  }

  const aliases = Object.entries(FAMILY_ALIASES)
    .filter(([className]) => FOUND_TOKENS.has(className.slice(3)))
    .map(([className]) => {
      return `.${className} { --fa-family: var(--fa-family-classic); }`
    })

  const banner = `/*!
 * Font Awesome Pro 7.2.0 by @fontawesome - https://fontawesome.com
 * License - https://fontawesome.com/license (Commercial License)
 * Copyright 2026 Fonticons, Inc.
 *
 * Subconjunto generado automáticamente por scripts/build-fontawesome-subset.mjs
 * No editar a mano: ejecutar \`npm run icons:build\`.
 */`

  const parts = [
    banner,
    buildFamilyCss(),
    iconCss.join('\n'),
  ]

  if (aliases.length) {
    parts.push(
      '/* Alias de estilos Pro no incluidos en el kit local (sin webfonts). */\n' +
        aliases.join('\n')
    )
  }

  const output = `${parts.join('\n\n')}\n`
  fs.mkdirSync(path.dirname(outFile), { recursive: true })
  fs.writeFileSync(outFile, output, 'utf8')

  const kb = (Buffer.byteLength(output) / 1024).toFixed(1)
  console.log(`✔ ${path.relative(root, outFile)} generado (${kb} KB)`)
  console.log(`  Iconos incluidos: ${available.length}`)

  if (missing.length) {
    console.warn(`  ⚠ No encontrados en el kit (${missing.length}): ${missing.join(', ')}`)
    process.exitCode = 1
  }

  const refs = [...output.matchAll(/url\(["']?([^"')]+)["']?\)/g)]
    .map((m) => m[1])
    .filter((url) => !url.startsWith('data:'))
  const missingFonts = [...new Set(refs)].filter((url) => {
    const abs = path.resolve(path.dirname(outFile), url)
    return !fs.existsSync(abs)
  })
  if (missingFonts.length) {
    console.warn(`  ⚠ Fuentes no encontradas: ${missingFonts.join(', ')}`)
    process.exitCode = 1
  }
}

main()

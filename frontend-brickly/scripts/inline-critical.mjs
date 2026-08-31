import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const htmlPath = path.join(projectRoot, 'dist', 'index.html')

if (!fs.existsSync(htmlPath)) {
  console.error('No se encontró dist/index.html. ¿Corrió `vite build` antes?')
  process.exit(1)
}

let html = fs.readFileSync(htmlPath, 'utf8')
let changed = false

const pick = (re) => {
  const m = html.match(re)
  return m ? m[1] : null
}

const fontUrl = pick(/href="([^"]*AppleGaramond[^"]*\.woff2)"/)
const fondoUrl = pick(/href="([^"]*fondo-[^"]*\.webp)"/)
const homeMovilUrl = pick(/href="([^"]*home_movil-[^"]*\.webp)"/)
const cssHref = pick(/<link rel="stylesheet"[^>]*href="([^"]+\.css)"/)
const scripts = [...html.matchAll(/<script type="module"[^>]*src="([^"]+\.js)"/g)].map(m => m[1])

if (!cssHref) {
  console.error('No se encontró el <link rel="stylesheet"> inyectado por Vite.')
  process.exit(1)
}

// Extraer los @font-face de RedHatDisplay del CSS principal para inlinearlos en el crítico
let redHatFaces = ''
try {
  const cssRelPath = 'assets/' + cssHref.split('/assets/').pop()
  const cssFile = fs.readFileSync(path.join(projectRoot, 'dist', cssRelPath), 'utf8')
  redHatFaces = (cssFile.match(/@font-face\{[^}]*?font-family:RedHatDisplay[^}]*?\}/g) || []).join('')
} catch (e) {
  console.warn('No se pudo leer el CSS para RedHatDisplay:', e.message)
}

const criticalCss = `
@font-face{font-family:'AppleGaramond';src:url(${fontUrl}) format('woff2');font-display:optional}
${redHatFaces}
#root{font-family:'RedHatDisplay'!important}
.banner{background-image:url(${fondoUrl});background-position:top;background-repeat:no-repeat;height:100dvh;background-size:100%;padding:.1px;color:#fff;position:relative;z-index:1}
.banner a{color:#fff}
@media only screen and (max-width:1200px){.banner{height:55dvw}}
@media only screen and (max-width:993px){.banner{background-image:url(${homeMovilUrl});background-size:cover;height:auto;min-height:100dvh;padding-bottom:3rem}}
@media only screen and (min-width:1200px){.hero-static-mob{display:none}}
@media only screen and (max-width:1199px){.hero-static-desk{display:none}}
`

const criticalTag = `<style id="critical-css">${criticalCss}</style>`
html = html.replace('</head>', `${criticalTag}\n    </head>`)
changed = true

const cssLinkRegex = /<link rel="stylesheet"[^>]*>/i
const cssLink = html.match(cssLinkRegex)
if (cssLink) {
  const nonce = crypto.randomBytes(16).toString('hex')
  const injectScript = `<script nonce="${nonce}">(function(){var l=document.createElement('link');l.rel='stylesheet';l.href='${cssHref}';document.head.appendChild(l)})();<\/script><noscript><link rel="stylesheet" href="${cssHref}"></noscript>`
  html = html.replace(cssLink[0], injectScript)
  html = html.replace('script-src \'self\'', `script-src 'self' 'nonce-${nonce}'`)
  changed = true
} else {
  console.error('No se pudo localizar el <link rel="stylesheet">.')
}

const modulePreloads = scripts
  .map(s => `<link rel="modulepreload" href="${s}">`)
  .join('\n    ')
html = html.replace('</head>', `${modulePreloads}\n    </head>`)
changed = true

const staticHero = `<div id="root">
      <div class="banner">
        <div class="hero-static-desk" style="max-width:1320px;margin-right:auto;margin-left:auto;padding-right:0.75rem;padding-left:0.75rem;">
          <div style="margin-top:clamp(2rem,25vh,20rem);">
            <div style="font-size:28px;margin-bottom:1rem;color:#fff;font-weight:300;">Las mejores propiedades de Guatemala</div>
            <div style="font-size:90px;font-family:AppleGaramond;line-height:1;color:#fff;white-space:pre-line;">Inmuebles verificados\n en las zonas m&aacute;s distinguidas</div>
          </div>
        </div>
        <div class="hero-static-mob" style="max-width:1320px;margin-right:auto;margin-left:auto;padding-right:0.75rem;padding-left:0.75rem;">
          <div style="margin-top:clamp(9rem,6vw,30rem);">
            <div style="font-size:clamp(18px,5vw,34px);margin-bottom:1rem;color:#fff;">Las mejores propiedades de Guatemala</div>
            <div style="font-size:clamp(40px,8.5vw,70px);font-family:AppleGaramond;line-height:1;color:#fff;">Inmuebles verificados en las zonas m&aacute;s distinguidas</div>
          </div>
        </div>
      </div>
    </div>`

const rootRe = /<div id="root"><\/div>/
if (rootRe.test(html)) {
  html = html.replace(rootRe, staticHero)
  changed = true
} else {
  console.error('No se encontró <div id="root"></div>.')
}

if (changed) {
  fs.writeFileSync(htmlPath, html, 'utf8')
  console.log('OK: CSS crítico inline, modulepreloads y hero estático inyectados en dist/index.html')
  console.log(`   - Fuente: ${fontUrl}`)
  console.log(`   - modulepreloads: ${scripts.join(', ')}`)
} else {
  console.error('No se aplicaron cambios.')
  process.exit(1)
}

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'




export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const basePath = env.VITE_BASE_PATH || '/'
  // Normalizar: asegurar que empiece con / y no termine con /
  const normalizedBase = '/' + basePath.replace(/^\/+|\/+$/g, '')
  const apiPrefix = normalizedBase === '/' ? '' : normalizedBase

  return {
    plugins: [
      react(),
      {
        name: 'serve-uploads',
        configureServer(server) {
          // Servir archivos estáticos de la carpeta uploads
          const uploadsPath = `${apiPrefix}/uploads`
          server.middlewares.use(uploadsPath, (req, res, next) => {
            const filePath = path.join(__dirname, 'uploads', req.url)
            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
              const ext = path.extname(filePath).toLowerCase()
              const mimeTypes = {
                '.webp': 'image/webp',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.gif': 'image/gif',
                '.svg': 'image/svg+xml',
              }
              res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream')
              res.setHeader('Cache-Control', 'public, max-age=31536000')
              res.end(fs.readFileSync(filePath))
              return
            }
            next()
          })
        }
      },
      {
        name: 'upload-proyectos',
        configureServer(server) {
          const uploadProyectosPath = `${apiPrefix}/api/upload-proyectos`
          server.middlewares.use(uploadProyectosPath, async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405
              res.end('Method Not Allowed')
              return
            }

            try {
              // Leer el body como JSON
              const chunks = []
              for await (const chunk of req) {
                chunks.push(chunk)
              }
              const buffer = Buffer.concat(chunks)
              const body = JSON.parse(buffer.toString())

              const { paths, userId } = body
              if (!paths || !Array.isArray(paths) || paths.length === 0) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'Se requiere { paths: [...], userId }' }))
                return
              }

              const destDir = path.resolve(__dirname, 'uploads/proye_arqui', userId)
              if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir, { recursive: true })
              }

              const finalFiles = []

              for (let i = 0; i < paths.length; i++) {
                const tempPath = paths[i].replace(/^\//, '')
                // Buscar en varias ubicaciones
                let sourceFile = path.resolve(__dirname, tempPath)
                if (!fs.existsSync(sourceFile)) {
                  sourceFile = path.resolve(__dirname, 'uploads', tempPath)
                }
                if (!fs.existsSync(sourceFile)) {
                  continue
                }

                const ext = path.extname(sourceFile) || '.jpg'
                const destFileName = `${userId}_${i}${ext}`
                const destPath = path.join(destDir, destFileName)

                fs.copyFileSync(sourceFile, destPath)
                const publicPath = `/uploads/proye_arqui/${userId}/${destFileName}`
                finalFiles.push(publicPath)
              }

              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({
                success: true,
                files: {
                  mainImage: finalFiles[0] || null,
                  mobileImage: finalFiles[1] || null,
                  images: finalFiles.slice(2)
                }
              }))
            } catch (error) {
              console.error('Error moving proyecto images:', error)
              res.statusCode = 500
              res.end(JSON.stringify({ error: error.message }))
            }
          })
        }
      },
      {
        name: 'upload-proyectos-direct',
        configureServer(server) {
          const uploadProyectosDirectPath = `${apiPrefix}/api/upload-proyectos-direct.php`
          server.middlewares.use(uploadProyectosDirectPath, async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405
              res.end(JSON.stringify({ error: 'Method Not Allowed' }))
              return
            }

            try {
              // Leer el body como buffer
              const chunks = []
              for await (const chunk of req) {
                chunks.push(chunk)
              }
              const buffer = Buffer.concat(chunks)

              // Parsear multipart/form-data manualmente
              const contentType = req.headers['content-type']
              const boundary = contentType.split('boundary=')[1]
              const parts = buffer.toString('binary').split(`--${boundary}`)

              let userId = ''
              let projectId = ''
              const files = []

              for (const part of parts) {
                if (part.includes('Content-Disposition')) {
                  const nameMatch = part.match(/name="([^"]+)"/)
                  if (!nameMatch) continue
                  const name = nameMatch[1]

                  const filenameMatch = part.match(/filename="([^"]+)"/)

                  if (filenameMatch) {
                    // Es un archivo
                    const contentStart = part.indexOf('\r\n\r\n') + 4
                    const contentEnd = part.lastIndexOf('\r\n')
                    const content = part.substring(contentStart, contentEnd)
                    files.push({
                      fieldname: name,
                      filename: filenameMatch[1],
                      buffer: Buffer.from(content, 'binary')
                    })
                  } else {
                    // Es un campo de texto
                    const contentStart = part.indexOf('\r\n\r\n') + 4
                    const contentEnd = part.lastIndexOf('\r\n')
                    const value = part.substring(contentStart, contentEnd).trim()
                    if (name === 'userId') userId = value
                    if (name === 'projectId') projectId = value
                  }
                }
              }

              if (!userId) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'Se requiere userId' }))
                return
              }

              // Usar projectId para el nombre del archivo, o userId como fallback
              const filePrefix = projectId || userId

              const destDir = path.resolve(__dirname, 'uploads/proye_arqui', userId)
              if (!fs.existsSync(destDir)) {
                fs.mkdirSync(destDir, { recursive: true })
              }

              const result = {
                mainImage: null,
                mobileImage: null,
                images: []
              }

              let imgIndex = 0

              for (const file of files) {
                let ext = path.extname(file.filename).toLowerCase()
                if (!['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'].includes(ext)) {
                  ext = '.jpg'
                }

                let destFileName
                if (file.fieldname === 'desktop') {
                  destFileName = `${filePrefix}_desktop${ext}`
                } else if (file.fieldname === 'mobile') {
                  destFileName = `${filePrefix}_mobile${ext}`
                } else {
                  destFileName = `${filePrefix}_${imgIndex}${ext}`
                  imgIndex++
                }

                const destPath = path.join(destDir, destFileName)
                fs.writeFileSync(destPath, file.buffer)

                const publicPath = `/uploads/proye_arqui/${userId}/${destFileName}`
                if (file.fieldname === 'desktop') {
                  result.mainImage = publicPath
                } else if (file.fieldname === 'mobile') {
                  result.mobileImage = publicPath
                } else {
                  result.images.push(publicPath)
                }
              }


              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({
                success: true,
                userId,
                files: result
              }))

            } catch (error) {
              console.error('Error in upload-proyectos-direct:', error)
              res.statusCode = 500
              res.end(JSON.stringify({ success: false, error: error.message }))
            }
          })
        }
      },

      {
        name: 'upload-logo',

        configureServer(server) {
          const uploadApiPath = `${apiPrefix}/api/upload-logo`
          server.middlewares.use(uploadApiPath, async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405
              res.end('Method Not Allowed')
              return
            }

            try {
              // Leer el body como buffer
              const chunks = []
              for await (const chunk of req) {
                chunks.push(chunk)
              }
              const buffer = Buffer.concat(chunks)

              // Parsear multipart/form-data manualmente
              const boundary = req.headers['content-type'].split('boundary=')[1]
              const parts = buffer.toString('binary').split(`--${boundary}`)
              
               let fileName = ''
               let fileBuffer = null
               let token = ''
               let turnstileToken = ''

               for (const part of parts) {
                 if (part.includes('Content-Disposition')) {
                   const nameMatch = part.match(/name="([^"]+)"/)
                   if (!nameMatch) continue
                   const name = nameMatch[1]

                   if (name === 'file') {
                     const filenameMatch = part.match(/filename="([^"]+)"/)
                     if (filenameMatch) {
                       fileName = filenameMatch[1]
                     }
                     // Extraer el contenido del archivo (después de las cabeceras)
                     const contentStart = part.indexOf('\r\n\r\n') + 4
                     const contentEnd = part.lastIndexOf('\r\n')
                     const content = part.substring(contentStart, contentEnd)
                     fileBuffer = Buffer.from(content, 'binary')
                   } else if (name === 'token') {
                     // Extraer el valor del token
                     const contentStart = part.indexOf('\r\n\r\n') + 4
                     const contentEnd = part.lastIndexOf('\r\n')
                     token = part.substring(contentStart, contentEnd).trim()
                   } else if (name === 'cf-turnstile-response') {
                     // Extraer el token de Turnstile
                     const contentStart = part.indexOf('\r\n\r\n') + 4
                     const contentEnd = part.lastIndexOf('\r\n')
                     turnstileToken = part.substring(contentStart, contentEnd).trim()
                   }
                 }
               }

              if (!fileBuffer || !fileName) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'No file provided' }))
                return
              }

              // Si el nombre del archivo tiene "unknown", intentar obtener userId del token
              if (fileName.includes('unknown') && token) {
                try {
                  const payloadBase64 = token.split('.')[1]
                  const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString())
                  const userId = payload?.sub || payload?.id || 'unknown'
                  fileName = `logo_${userId}.webp`
                } catch (e) {
                  console.error('Error decoding token:', e)
                }
              }

              // Asegurar que la carpeta existe
              const logoDir = path.resolve(__dirname, 'uploads/logos')
              if (!fs.existsSync(logoDir)) {
                fs.mkdirSync(logoDir, { recursive: true })
              }

              // Guardar el archivo
              const filePath = path.join(logoDir, fileName)
              fs.writeFileSync(filePath, fileBuffer)

              const logoPath = `/uploads/logos/${fileName}`

              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true, logo: logoPath }))
            } catch (error) {
              console.error('Error uploading logo:', error)
              res.statusCode = 500
              res.end(JSON.stringify({ error: error.message }))
            }
          })
        }
      }
    ],
    base: normalizedBase === '/' ? '/' : normalizedBase + '/',
    build: {
      // Generar source maps en producción para debugging (opcional)
      sourcemap: false,
      // Chunk splitting strategy
      rollupOptions: {
        output: {
          manualChunks: {
            // React y librerías core
            'vendor-react': ['react', 'react-dom', 'react-router-dom', 'react-bootstrap'],
            // Librerías de UI pesadas
            'vendor-ui': ['bootstrap', 'slick-carousel', 'glightbox', 'aos', 'alertifyjs'],
            // Mapas (solo si se usan)
            'vendor-maps': ['leaflet', 'react-leaflet', '@mapbox/search-js-react'],
            // Editor
            'vendor-editor': ['ckeditor5', '@ckeditor/ckeditor5-react'],
            // Utilidades
            'vendor-utils': ['jquery', 'datatables.net-dt', 'datatables.net-responsive-dt'],
          }
        }
      },
      // Comprimir assets en producción
      minify: 'esbuild',
      // Advertencia si el chunk es muy grande
      chunkSizeWarningLimit: 500,
    },
    server: {
      port: 5173,
      hmr: {
        overlay: true
      },
      fs: {
        allow: [
          path.resolve(__dirname),
          path.resolve(__dirname, 'src'),
          path.resolve(__dirname, 'uploads')
        ]
      }
    }
  }
})

# Webservice API - rutas disponibles

Ultima revision: 2026-06-22.

Esta recopilacion fue hecha leyendo los controladores, modulos, DTOs y servicios de `src/`.
No se detecta `setGlobalPrefix`, por lo que las rutas se exponen sin prefijo global.
El puerto por defecto es `3000`, salvo que exista `PORT` en variables de entorno.

Notas generales:

- Autenticacion JWT: enviar `Authorization: Bearer <token>`.
- Roles disponibles: `admin`, `desarrolladora`, `agente`, `arquitecto`, `agencia`, `cliente`.
- `RolesGuard` sin `@Roles(...)` solo exige JWT, porque si no hay roles requeridos permite pasar.
- Existe `ValidationPipe` global con `whitelist`, `forbidNonWhitelisted` y `transform`.
- La validacion real aplica principalmente en DTOs de clase. Bodies `any` o tipos inline de TypeScript no tienen validacion runtime fuerte.
- `app.useStaticAssets(join(process.cwd(), 'uploads'))` sirve archivos estaticos desde la carpeta `uploads`.
- `src/app.controller.ts` define `GET /`, pero `AppModule` no registra `AppController`; por eso no se considera una ruta activa de la app.

## Resumen

Rutas activas encontradas: **74**.

| Modulo | Rutas |
| --- | ---: |
| Auth | 9 |
| Users | 15 |
| Properties | 15 |
| Fileuploads | 2 |
| Payments | 2 |
| Webhooks | 1 |
| Reviews | 4 |
| Contact | 11 |
| Projects | 6 |
| Partners | 6 |
| Easybroker | 3 |

## Auth

Controlador: `src/auth/auth.controller.ts`

| Metodo | Ruta | Auth | Entrada | Uso |
| --- | --- | --- | --- | --- |
| POST | `/auth/login` | Publica | Body: `email`, `password` | Inicia sesion y devuelve `access_token`. |
| POST | `/auth/register` | Publica | Body libre usado para crear usuario. Espera al menos `email`, `password`; normalmente `name`, `phone`. | Registra usuario con rol `cliente`. |
| POST | `/auth/create-user` | JWT + roles `admin`, `agencia`, `desarrolladora` | Body libre de usuario. | Crea usuarios desde panel. Admin puede asignar rol con `roles[0]`; agencia/desarrolladora crean `agente` con `parentId` del usuario logueado. |
| GET | `/auth/google` | Google OAuth | Query opcional: `app=panel\|web\|mobile` | Inicia login con Google. |
| GET | `/auth/google/callback` | Google OAuth | Callback OAuth | Valida usuario Google, genera token y redirige segun `LOGIN_GOOGLE_REDIR_*`. |
| POST | `/auth/forgot-password` | Publica | Body: `email` | Envia codigo de recuperacion. |
| POST | `/auth/reset-password` | Publica | Body: `email`, `code`, `newPassword` | Cambia la contrasena usando codigo. |
| POST | `/auth/code/account/send` | JWT | Sin body | Envia codigo de verificacion de cuenta al usuario logueado. |
| POST | `/auth/code/account/check` | JWT | Body: `code` | Verifica cuenta con codigo. |

## Users

Controlador: `src/users/users.controller.ts`

| Metodo | Ruta | Auth | Entrada | Uso |
| --- | --- | --- | --- | --- |
| GET | `/users/list-user` | Publica | Query: filtros de usuario, `page`, `limit`, `orderby`, `isEnable`, `parentId`, `hasProperty` | Lista usuarios paginados. |
| GET | `/users/list-user-me` | JWT | Query igual a `list-user`; fuerza `parentId` al usuario logueado | Lista usuarios hijos del usuario logueado. |
| GET | `/users/profile/:slug` | Publica | Param: `slug` amigable; tambien acepta ObjectId legacy de 24 caracteres | Obtiene un perfil publico por `profileSlug`. Si recibe un ObjectId, mantiene compatibilidad buscando por id. Si el usuario no tiene `profileSlug`, lo genera y guarda automaticamente. |
| GET | `/users/me` | JWT | Sin entrada | Devuelve perfil del usuario logueado. |
| PUT | `/users/me` | JWT | Body `UpdateUserDto` | Actualiza perfil propio. |
| PUT | `/users/me/avatar` | JWT | Multipart field `file`; imagen jpg/jpeg/png/webp, max 2 MB | Sube avatar y actualiza `avatar`. |
| GET | `/users/favorites` | JWT | Sin entrada | Devuelve usuario con `favorites` populado. |
| GET | `/users/:id` | JWT | Param: `id` | Obtiene usuario por id. |
| PUT | `/users/:id` | JWT + roles `admin`, `agencia`, `desarrolladora` | Param: `id`; Body `UpdateUserDto` | Actualiza usuario. Agencia/desarrolladora solo pueden editar hijos. |
| POST | `/users/favorites/:propertyId` | JWT | Param: `propertyId` | Agrega/quita una propiedad de favoritos. |
| POST | `/users/:id/click` | Publica | Param: `id` | Incrementa contador de clicks del usuario. |
| POST | `/users/:id/click-ws` | Publica | Param: `id` | Incrementa contador de clicks de WhatsApp del usuario. |
| DELETE | `/users/:id` | JWT + roles `admin`, `agencia`, `desarrolladora` | Param: `id` | Elimina usuario y datos relacionados. Agencia/desarrolladora solo pueden eliminar hijos. |
| PUT | `/users/easybroker/apikey` | JWT | Body: `apiKey` | Guarda API key de EasyBroker para el usuario logueado. |
| PUT | `/users/easybroker-adm/apikey` | JWT + rol `admin` | Body: `userId`, `apiKey` | Guarda API key de EasyBroker para otro usuario. |

Campos de `UpdateUserDto`:

- `email`, `name`, `phone`, `password`, `roles`, `avatar`, `profileSlug`, `personalInfo`, `agentInfo`, `isEnabled`, `featured_user`, `featured_expire`.

Notas de `profileSlug`:

- Se normaliza desde `name`, o desde el prefijo del `email` si no hay nombre.
- Se guarda unico por usuario y agrega sufijos (`-2`, `-3`, etc.) cuando hay colisiones.
- Reserva slugs sensibles como `perfil`, `profile`, `me`, `list-user`, `favorites`, `easybroker`, `login`, `registro`, `admin`, `api`, `users`; en esos casos agrega `-perfil`.
- `POST /auth/register`, `POST /auth/create-user` y creaciones internas guardan `profileSlug` desde el inicio.
- `GET /users/profile/:slug` y `GET /users/:id` mantienen autorreparacion puntual si el usuario no tiene `profileSlug`.
- Los listados no generan ni guardan slugs; son solo lectura.
- El script `npm run backfill:profile-slugs` genera slugs para usuarios existentes que aun no tengan `profileSlug`.

Filtros utiles de `/users/list-user`:

- `page`, `limit` max 100.
- `orderby=campo:asc` o `orderby=campo:desc`.
- `isEnable=true|false` se transforma a `isEnabled`.
- `parentId=<mongoId>`.
- `hasProperty=published|pre-published|draft|trash|disabled`.
- Cualquier otro query queda como filtro directo contra el modelo `User`, por ejemplo `roles=agente`.

## Properties

Controlador: `src/properties/properties.controller.ts`

| Metodo | Ruta | Auth | Entrada | Uso |
| --- | --- | --- | --- | --- |
| POST | `/properties` | JWT + roles `admin`, `desarrolladora`, `agencia`, `agente` | Body `CreatePropertyDto` | Crea propiedad. Asigna `userId` del JWT, genera `folderId` y procesa media temporal. Si el rol es `agente`, se agrega a `agents`. |
| POST | `/properties/assign-agent/:id` | JWT + roles `admin`, `desarrolladora`, `agencia` | Param: `id`; Body: `agents?: string[]` | Asigna agentes a propiedad. Agencia/desarrolladora solo sobre propiedades propias. |
| GET | `/properties` | Publica | Query filtros, paginacion y orden | Lista propiedades paginadas. |
| GET | `/properties/metricas` | JWT | Sin entrada | Metricas del usuario logueado y sus subusuarios. |
| GET | `/properties/metricas-adm` | JWT + rol `admin` | Sin entrada | Metricas administrativas globales. |
| GET | `/properties/var-ranges` | Publica | Sin entrada | Rangos min/max de precio y tamanos para propiedades publicadas. |
| GET | `/properties/:id` | Publica | Param: `id` ObjectId o `propertySlug` | Obtiene propiedad por id o slug amigable. Si la propiedad no tiene `propertySlug`, lo genera y guarda automaticamente. |
| PUT | `/properties/:id` | JWT + roles `admin`, `desarrolladora`, `agencia`, `agente` | Param: `id`; Body `UpdatePropertyDto` | Actualiza propiedad. Si viene `media`, mueve/optimiza archivos temporales. |
| DELETE | `/properties/:id` | JWT + roles `admin`, `desarrolladora`, `agencia`, `agente` | Param: `id` | Elimina propiedad. |
| POST | `/properties/:id/visit` | Publica | Param: `id` ObjectId o `propertySlug` | Incrementa visitas y crea activity log. |
| POST | `/properties/:id/click` | Publica | Param: `id` ObjectId o `propertySlug` | Incrementa clicks y crea activity log. |
| GET | `/properties/metricas/:id` | JWT | Param: `id` usuario/agencia | Metricas de un usuario/agencia especifica. |
| GET | `/properties/metricas-agente/:id` | JWT | Param: `id` agente | Metricas de agente. |
| GET | `/properties/count/status-agents/:id` | Publica | Param: `id` agencia/usuario | Reporte de propiedades por agente y status. |
| GET | `/properties/count/total/:id` | Publica | Param: `id` usuario/agencia | Total de propiedades y total publicadas. |

Campos principales de `CreatePropertyDto` / `UpdatePropertyDto`:

- `userId`, `featured`, `exclusive`, `status`, `propertySlug`, `agents`.
- `market`: `title`, `description`, `price`, `priceUSD`, `exchangeRate`, `operationType`, `propertyType`, `pricePerM2`, `priceM2USD`, `type`, `mode`, `showprice`.
- `dimensions`: `landM2`, `landV2`, `constructionM2`, `storageM2`.
- `expenses`: `stoveType`, `municipality`, `waterService`, `includes`, `iusi`, `maintenanceCost`.
- `structure`: `constructionYear`, `remodelYear`, `levels`, `ceilingHeight`, `perimeterWall`.
- `layout`: `totalRooms`, `bedrooms`, `bathrooms`, `halfBathrooms`, `serviceRoom`, `deck`, `parkingSpots`, `furnished`, `floors`, `driveaway`, `laundry`, `study`, `familyroom`.
- `location`, `amenities`, `media`, `extraFeatures`, `folderId`, `reasonRejected`.

Notas de `propertySlug`:

- Se genera desde `market.title` al crear una propiedad.
- Si `market.title` cambia al editar, se genera un nuevo slug desde el nuevo titulo.
- Se guarda unico por propiedad y agrega sufijos (`-2`, `-3`, etc.) cuando hay colisiones.
- Reserva slugs sensibles como `metricas`, `metricas-adm`, `var-ranges`, `count`, `add`, `edit`, `view`, `planes`, `propiedad`, `propiedades`, `api`; en esos casos agrega `-propiedad`.
- El script `npm run backfill:property-slugs` genera slugs para propiedades existentes que aun no tengan `propertySlug`.

Filtros utiles de `GET /properties`:

- `page`, `limit` max 100.
- `orderby=campo:asc` o `orderby=campo:desc`; tambien acepta multiples `orderby`.
- `agents=<id>` o `agents[]=<id>`.
- `userId=<id>` filtra por usuario y sus subusuarios.
- `search=<texto>` usa indice `$text` sobre titulo, descripcion, departamento y direccion.
- `priceMin`, `priceMax` filtran `market.price`.
- `priceUSDMin`, `priceUSDMax` filtran `market.priceUSD`.
- Cualquier otro query queda como filtro directo contra el modelo, por ejemplo `status=published`, `market.type=...`, `location.department=...`.

## Fileuploads

Controlador: `src/fileuploads/fileuploads.controller.ts`

| Metodo | Ruta | Auth | Entrada | Uso |
| --- | --- | --- | --- | --- |
| POST | `/fileuploads/temp` | Publica | Multipart fields: `image` max 10, `doc` max 5, `video` max 5, `tour` max 5 | Sube archivos a `uploads/temp`. Imagenes se convierten a webp. |
| POST | `/fileuploads/save` | Publica | Multipart fields iguales a `temp`; Body field `pathsave` | Sube archivos a `uploads/assets/<pathsave>`. Imagenes se convierten a webp. |

Restricciones:

- Imagen: jpg, jpeg, png, webp.
- Documento: pdf, doc, docx, csv, xls, xlsx.
- Video: mp4, webm, ogg, quicktime, x-msvideo.
- Tamano maximo por archivo: 20 MB.
- `pathsave` se normaliza y rechaza `..`.

## Payments

Controlador: `src/payments/payments.controller.ts`

| Metodo | Ruta | Auth | Entrada | Uso |
| --- | --- | --- | --- | --- |
| POST | `/payments/subscribe` | JWT | Body: `plan` (`prod_52hzbwb9`, `prod_bjlws6a6`, `prod_a3poa7d6`, `prod_z6hcx0vn`) | Crea suscripcion recurrente. |
| POST | `/payments/featured` | JWT | Body: `type`, `id`, `plan` | Crea cargo para destacar propiedad o usuario. |

Planes recurrentes (`PlanType`):

- `prod_52hzbwb9`: agente basico.
- `prod_bjlws6a6`: desarrolladora.
- `prod_a3poa7d6`: agencia.
- `prod_z6hcx0vn`: arquitecto.

Planes destacados (`AllPlanType`):

- `PROPERTY_FEATURED`, `AGENT_SIGNATURE`, `AGENT_PRESTIGE`, `PRIVATE_AGENT`, `AGENCY_SIGNATURE`, `PRIVATE_AGENCY`.

## Webhooks

Controlador: `src/webhooks/webhooks.controller.ts`

| Metodo | Ruta | Auth | Entrada | Uso |
| --- | --- | --- | --- | --- |
| POST | `/webhooks/recurrente` | Publica | Body de evento Recurrente | Procesa `subscription.paid`, `subscription.failed` y `charge.succeeded`. |

Eventos:

- `subscription.paid`: crea/actualiza suscripcion y agrega rol segun plan.
- `subscription.failed`: marca suscripcion fallida y remueve rol.
- `charge.succeeded`: activa propiedad destacada o usuario destacado por 30 dias segun metadata.

## Reviews

Controlador: `src/reviews/reviews.controller.ts`

| Metodo | Ruta | Auth | Entrada | Uso |
| --- | --- | --- | --- | --- |
| POST | `/reviews` | JWT | Body: `agentId`, `rating`, `comment?` | Crea review para agente. |
| POST | `/reviews/update` | JWT | Body: `agentId`, `rating`, `comment?` | Actualiza review existente del usuario logueado. |
| GET | `/reviews/agent/:agentId` | Publica | Param: `agentId` | Lista reviews de un agente. |
| DELETE | `/reviews/:agentId` | JWT | Param: `agentId` | Elimina review del usuario logueado para ese agente. |

## Contact

Controlador: `src/contact/contact.controller.ts`

| Metodo | Ruta | Auth | Entrada | Uso |
| --- | --- | --- | --- | --- |
| POST | `/contact` | Publica | Body: `name`, `lastname`, `phone`, `email`, `message`, `type` | Guarda contacto del sitio y envia correos. |
| POST | `/contact/agente` | Publica | Body: `name`, `lastname`, `phone`, `email`, `message`, `agentId`, `info`, `type` | Guarda lead para agente y envia correos. |
| POST | `/contact/subscribe` | Publica | Body: `email` | Suscribe correo a newsletter. |
| GET | `/contact/agency/top-leads` | Publica | Sin entrada | Ranking top/bottom 5 de agencias por leads. |
| GET | `/contact/migrate-id-db` | Publica | Sin entrada | Migra `parentId` y `agentId` string/false a ObjectId/null. Ruta sensible. |
| GET | `/contact/agency/top-clickws` | Publica | Sin entrada | Ranking top/bottom 5 por clicks WhatsApp. |
| GET | `/contact/agency/top-click` | Publica | Sin entrada | Ranking top/bottom 5 por clicks normales. |
| GET | `/contact/leads` | Publica | Query: filtros directos de lead | Lista leads con orden `createdAt desc`. |
| GET | `/contact/site/forms` | Publica | Query: filtros directos; `orderby` opcional | Lista formularios de contacto del sitio. |
| GET | `/contact/total-contact-site` | Publica | Sin entrada | Totales y crecimiento mensual de contactos del sitio. |
| GET | `/contact/total-leads-count/:id` | Publica | Param: `id` usuario/agencia | Totales y crecimiento mensual de leads del usuario y agentes hijos. |

Query util de `/contact/site/forms`:

- `orderby=campo:asc` o `orderby=campo:desc`.
- Otros query params se usan como filtros directos.

## Projects

Controlador: `src/projects/projects.controller.ts`

| Metodo | Ruta | Auth | Entrada | Uso |
| --- | --- | --- | --- | --- |
| POST | `/projects` | JWT | Body `CreateProjectDto` | Crea proyecto con `userId` del usuario logueado. |
| GET | `/projects` | Publica | Sin entrada | Lista proyectos ordenados por `createdAt desc`. |
| GET | `/projects/user/:userId` | Publica | Param: `userId` | Lista proyectos por usuario. |
| GET | `/projects/:id` | Publica | Param: `id` | Obtiene proyecto por id. |
| PATCH | `/projects/:id` | Publica | Param: `id`; Body libre | Actualiza proyecto. |
| DELETE | `/projects/:id` | JWT | Param: `id` | Elimina proyecto si pertenece al usuario logueado. |

Campos de `CreateProjectDto`:

- `title`, `description`, `shortDescription`, `address`, `date_project`, `mainImage`, `mainImageAlter`, `status`, `images`.

## Partners

Controlador: `src/partners/partners.controller.ts`

| Metodo | Ruta | Auth | Entrada | Uso |
| --- | --- | --- | --- | --- |
| POST | `/partners` | JWT + rol `admin` | Body libre, esperado por schema: `logo_url`, `name`, `expire_date`, `category`, `type` | Crea asociado/partner. |
| GET | `/partners/next-expiring` | JWT | Query opcional: `limit` default 10 | Lista asociados activos proximos a expirar. |
| PATCH | `/partners/:id` | JWT + rol `admin` | Param: `id`; Body libre | Actualiza partner. |
| DELETE | `/partners/:id` | JWT + rol `admin` | Param: `id` | Elimina partner. |
| GET | `/partners` | Publica | Query: `category`, `type`, `active=true` | Lista partners filtrados. |
| GET | `/partners/:id` | Publica | Param: `id` | Obtiene partner por id. |

## Easybroker

Controlador: `src/easybroker/easybroker.controller.ts`

| Metodo | Ruta | Auth | Entrada | Uso |
| --- | --- | --- | --- | --- |
| POST | `/easybroker/sync/:userId` | Publica | Param: `userId` | Sincroniza propiedades de EasyBroker para usuario. |
| POST | `/easybroker/images-restore/:userId` | Publica | Param: `userId` | Restaura imagenes de propiedades importadas. |
| POST | `/easybroker/optimize-images/:userId` | Publica | Param: `userId` | Optimiza imagenes de propiedades importadas. |

## Rutas potenciales pero no activas

| Metodo | Ruta | Motivo |
| --- | --- | --- |
| GET | `/` | `AppController` existe, pero `AppModule` no lo registra en `controllers`. |

## Rutas publicas sensibles detectadas

Estas rutas no tienen `UseGuards` en el controlador actual y conviene revisarlas antes de exponer produccion:

- `GET /contact/migrate-id-db`
- `POST /easybroker/sync/:userId`
- `POST /easybroker/images-restore/:userId`
- `POST /easybroker/optimize-images/:userId`
- `PATCH /projects/:id`
- `GET /contact/leads`
- `GET /contact/site/forms`
- `GET /properties/count/status-agents/:id`
- `GET /properties/count/total/:id`
- `POST /fileuploads/temp`
- `POST /fileuploads/save`

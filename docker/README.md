# Compilar la imagen y conectar Search por Docker

La imagen del frontend admite `SEARCH_URL` como variable de ejecución. Angular
llama a `./search` y el Nginx del contenedor reenvía el POST a esa URL conservando
el cuerpo, las cabeceras de autenticación y los parámetros de consulta.
El destino interno no se incrusta en el JavaScript compilado.

## Compilar la imagen completa

Desde la raíz, con Node 24, npm 11 y Docker:

```bash
npm ci
npm run build -- --configuration=production
docker build -t alfdockia-front:local .
```

El Dockerfile consume `dist/content-ce`, por lo que Angular se compila primero.
No hace falta exportar `BASE_URL` ni `SEARCH_URL` durante la compilación.
La imagen debe construirse o cargarse en la máquina que ejecuta Compose.

## Configuración en Compose

En el servicio existente del frontend, conservar su red y sus reglas de proxy,
y utilizar esta imagen y estas variables:

```yaml
services:
  content-app:
    image: alfdockia-front:local
    environment:
      SEARCH_URL: "http://alfresco-qdrant-search:8084/search"
      BASE_PATH: "/"
      APP_CONFIG_AUTH_TYPE: "BASIC"
      APP_CONFIG_PROVIDER: "ECM"
      APP_CONFIG_ECM_HOST: "{protocol}//{hostname}{:port}"
```

Este es un fragmento para incorporar al servicio existente, no un Compose
completo. `alfresco-qdrant-search` debe ser un nombre o alias accesible en la red
Docker del frontend. `8084` es el puerto interno del servicio; no se necesita
publicarlo en el host para esta comunicación.

`BASE_URL` no se debe apuntar a Search: en desarrollo identifica el backend
Alfresco. En Docker se utilizan `APP_CONFIG_ECM_HOST` y el proxy externo para
las peticiones al repositorio. Mantener las reglas existentes de `/alfresco`.

Con Traefik publicando `/content-app/` y eliminando ese prefijo mediante
StripPrefix, usar `BASE_PATH=/`. El navegador solicita `/content-app/search`,
Traefik entrega `/search` al frontend y Nginx lo envía al servicio interno.
Si la aplicación se publica en la raíz, el navegador solicita `/search`:
esa ruta debe llegar al frontend para que actúe este proxy. Revisar las reglas
externas si `/search` estaba enrutado directamente a otro servicio.

## Aplicar los cambios

Desde la carpeta del Compose, con Search disponible en la red compartida:

```bash
docker compose up -d --no-deps --force-recreate content-app
docker compose logs --tail=80 content-app
```

Recargar el navegador para volver a cargar `app.config.json`.
Las peticiones seguirán mostrando el dominio público en DevTools: el salto a
`alfresco-qdrant-search:8084` ocurre dentro de Docker. No es una redirección HTTP.
Para cambiar host, puerto o ruta, editar `SEARCH_URL` y recrear `content-app`;
no es necesario volver a compilar la imagen.

## Verificación aislada del proxy

Con `nginx:stable-alpine` y `python:3.11-slim` disponibles localmente:

```bash
python3 scripts/tests/docker-search-proxy.py

# Verificar también la imagen construida y su entrypoint real
FRONTEND_IMAGE=alfdockia-front:local python3 scripts/tests/docker-search-proxy.py
```

La prueba usa un backend temporal y comprueba POST, cuerpo, autorización,
query string, destino configurable y publicación en subruta. Elimina únicamente
los contenedores y la red que crea; no ejecuta búsquedas contra cloud.

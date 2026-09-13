# AlfDockia Frontend

Frontend basado en Alfresco Content App 8, Angular 20, Alfresco ADF 9 y Nx.
La extensión propia `projects/aca-ai-agents` incorpora la administración de
agentes (acceso de administrador) y la búsqueda IA. `app/` contiene la aplicación
anfitriona; `projects/aca-content` contiene los componentes de contenido de ACA;
`projects/aca-shared` contiene utilidades compartidas, y `e2e/` las pruebas Playwright.

## Desarrollo local en Linux

Requisitos del proyecto: Node.js 24.x y npm 11.x. Si utilizas nvm:

```bash
nvm install 24
nvm use 24
npm install --global npm@11
```

Desde la raíz del repositorio, instala las dependencias respetando el lockfile:

```bash
npm ci
```

Arranca el frontend contra Alfresco cloud:

```bash
BASE_URL=https://alfdockia.eu SEARCH_URL=https://alfdockia.eu/search npm start
```

Abre <http://localhost:4200> e inicia sesión con tu usuario de Alfresco.
`ecmHost` en `app/src/app.config.json` utiliza el origen del frontend. El proxy de
desarrollo (`app/proxy.conf.js`) reenvía `/alfresco` a `BASE_URL` y `/search` a
`SEARCH_URL`. En DevTools las peticiones aparecen como `localhost:4200/alfresco`,
pero Angular las reenvía al repositorio cloud. Esto evita las peticiones CORS
`OPTIONS` entre dominios, que el servidor cloud rechaza con 401 aunque las
credenciales sean válidas. El comando levanta solo el frontend; los servicios
de backend deben estar disponibles en cloud. Usa `Ctrl+C` para detenerlo.

Para guardar los destinos localmente, copia `.env.example` a `.env` y ejecuta
`npm start`: Nx carga las variables del archivo `.env`. Este archivo está excluido
de Git. No añadas `/alfresco` al final de `BASE_URL`. Si no defines `SEARCH_URL`,
la búsqueda IA utiliza por defecto `http://localhost:8084/search`.

Para compilar: `npm run build`. Para compilar solo la extensión:
`npm run build:aca-ai-agents`.

## Documentación de la base Alfresco Content App

Please refer to the public [documentation](https://alfresco-content-app.netlify.app/) for more details

## Requirements

| Name    | Version |
|---------|---------|
| Node.js | 24.x    |
| Npm     | 11.x     |

## Compatibility

| ACA   | ADF           | ACS        | Node | Angular |
|-------|---------------|------------|------|---------|
| 8.0.x | 9.0.0         | 26.x       | 24.x | 20.x    |
| 7.5.x | 8.5.0         | 26.x       | 24.x | 19.x    |
| 7.4.x | 8.4.1         | 26.x       | 24.x | 19.x    |
| 7.3.x | 8.3.1         | 26.x       | 24.x | 19.x    |
| 7.2.x | 8.2.1         | 23.x, 25.x | 22.x | 19.x    |
| 7.1.x | 8.1.1         | 25.2       | 22.x | 19.x    |
| 7.0.x | 8.0.0         | 25.2       | 22.x | 19.x    |
| 6.0.x | 7.0.0         | 25.1       | 20.x | 17.x    |
| 5.3.x | 7.0.0-alpha.7 | 23.4       | 18.x | 16.x    |
| 5.2.x | 7.0.0-alpha.6 | 23.4       | 18.x | 16.x    |
| 5.1.x | 7.0.0-alpha.3 | 23.3       | 18.x | 15.x    |
| 5.0.x | 7.0.0-alpha.2 | 23.3       | 18.x | 15.x    |
| 4.4.x | 6.7           | 23.2       | 18.x | 14.x    |
| 4.3.x | 6.4           | 23.1       | 18.x | 14.x    |
| 4.2.x | 6.3           | 23.1.0-M4  | 18.x | 14.x    |
| 4.1.x | 6.2           | 7.4        | 18.x | 14.x    |
| 4.0.x | 6.1           | 7.4        | 14.x | 14.x    |
| 3.1.x | 5.1           | 7.3        |      |         |
| 3.0.x | 5.0           | 7.3        |      |         |

> See <https://angular.io/guide/versions> for more details on Angular and Node.js compatibility

## Running

Create an `.env` file in the project root folder with the following content

```yml
BASE_URL="<URL>"
```

Where `<URL>` is the address of the ACS.

Run the following commands:

```sh
npm install
npm start
```

## Unit Tests

Use following command to test the projects:

```sh
nx test <project>
```

### Code Coverage

The projects are already configured to produce code coverage reports in console and HTML output.

You can view HTML reports in the `./coverage/<project>` folder.

When working with unit testing and code coverage improvement, you can run unit tests in the "live reload" mode:

```sh
nx test <project> -- --watch
```

Upon changing unit tests code, you can track the coverage results either in the console output, or by reloading the HTML report in the browser.

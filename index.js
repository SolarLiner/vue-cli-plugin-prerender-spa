//@ts-check
const { exists } = require("fs");
const path = require("path");

const PrerenderSPAPlugin = require("prerender-spa-plugin");
const Renderer = PrerenderSPAPlugin.PuppeteerRenderer;

const CONFIG_OBJ_PATH = "pluginOptions.prerenderSpa";

module.exports = (api, projectOptions) => {
  api.chainWebpack(chain(api, projectOptions));
};

function chain(api, projectOptions) {
  return config => {
    const options = pickle(projectOptions, CONFIG_OBJ_PATH);
    if (options.onlyProduction && process.env.NODE_ENV !== "production") {
      return;
    }
    const renderer = createRenderer(api, projectOptions);
    const paths = resolvePaths(api, projectOptions.outputDir, projectOptions.assetsDir, projectOptions.indexPath);
    const prerenderOptions = {
      ...paths,
      routes: pickle(projectOptions, CONFIG_OBJ_PATH),
      renderer,
      postProcess: renderedRoute => {
        const route = renderedRoute.route;
        if (route[route.length - 1] !== "/" && path.extname(route) === "") {
          renderedRoute.outputPath = path.join(paths.outputDir || paths.staticDir, `${route}.html`);
        }
        return renderedRoute;
      }
    };
    config.plugin("pre-render").use(PrerenderSPAPlugin, [prerenderOptions]);
  };
}

function createRenderer(api, projectOptions) {
  const rendererConfig = createConfig(pickle(projectOptions, CONFIG_OBJ_PATH));
  const renderer = new Renderer(rendererConfig);
  renderer.preServer = Prerenderer => {
    if (projectOptions.baseUrl) {
      const prefix = projectOptions.baseUrl;
      const server = Prerenderer._server._expressServer;
      server.use((req, res, next) => {
        if (req.url.indexOf(prefix) === 0) {
          req.url = req.url.slice(prefix.length - 1);
        }
        next();
      });
    }
    if (projectOptions.pages) {
      const server = Prerenderer._server._expressServer;
      server.get("*", (req, res, next) => {
        if (!path.extname(req.url)) {
          const filePath = api.resolve(
            `${projectOptions.outputDir}${req.url}${path.basename(req.url) ? ".html" : "index.html"}`
          );
          exists(filePath, exists => (exists ? res.sendFile(filePath) : next()));
          return;
        }
        next();
      });
    }
  };
  return renderer;
}

function createConfig(options) {
  let rendererConfig = {
    headless: options.headless,
    maxConcurrentRoutes: options.parallel ? 4 : 1
  };
  if (options.useRenderEvent) {
    rendererConfig["renderAfterDocumentEvent"] = "x-app-rendered";
  }
  if (options.customRendererConfig) {
    Object.assign(rendererConfig, options.customRendererConfig);
  }
  return rendererConfig;
}

function resolvePaths(api, baseUrl, assetsDir, indexPath) {
  return {
    outputDir: api.resolve(baseUrl),
    staticDir: api.resolve(baseUrl),
    assetsDir: api.resolve(path.join(baseUrl, assetsDir)),
    indexPath: api.resolve(path.join(baseUrl, indexPath))
  };
}

function pickle(object, path) {
  const keys = path.split(".");
  for (const key of keys) {
    object = object[key];
  }
  return object;
}

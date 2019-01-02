//@ts-check
const { exists, existsSync, readFileSync } = require("fs");
const path = require("path");

const PrerenderSPAPlugin = require("prerender-spa-plugin");
const Renderer = PrerenderSPAPlugin.PuppeteerRenderer;

const CONFIG_OBJ_PATH = "pluginOptions.prerenderSpa";

module.exports = (api, projectOptions) => {
  api.chainWebpack(chain(api, projectOptions));
};

function chain(api, projectOptions) {
  return config => {
    let options;
    try {
      options = pickle(projectOptions, CONFIG_OBJ_PATH);
    } catch {
      if (existsSync) {
        options = JSON.parse(readFileSync("./.prerender-spa.json").toString("utf-8"));
      }
    }
    if (options.onlyProduction && process.env.NODE_ENV !== "production") {
      return;
    }
    const renderer = createRenderer(api, projectOptions);
    const paths = resolvePaths(api, projectOptions.outputDir, projectOptions.assetsDir);
    const prerenderOptions = {
      ...paths,
      routes: options.renderRoutes,
      renderer,
      postProcess: renderedRoute => {
        const route = renderedRoute.route;
        if (route[route.length - 1] !== "/" && path.extname(route) === "") {
          renderedRoute.outputPath = path.join(paths.outputDir || paths.staticDir, `${route}.html`);
        }
        const userPostProcess =
          options.postProcess && typeof options.postProcess === "function" ? options.postProcess : noop;
        return userPostProcess(renderedRoute);
      }
    };
    config.plugin("pre-render").use(PrerenderSPAPlugin, [prerenderOptions]);
    config.plugin("html").tap(args => {
      args[0].template = api.resolve("public/index.html");
      args[0].filename = "app.html";
      return args;
    });
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

function resolvePaths(api, baseUrl, assetsDir) {
  return {
    outputDir: api.resolve(baseUrl),
    staticDir: api.resolve(baseUrl),
    assetsDir: api.resolve(path.join(baseUrl, assetsDir)),
    indexPath: api.resolve(path.join(baseUrl, "app.html"))
  };
}

function pickle(object, path) {
  const keys = path.split(".");
  for (const key of keys) {
    object = object[key];
  }
  return object;
}

function noop(arg) {
  return arg;
}

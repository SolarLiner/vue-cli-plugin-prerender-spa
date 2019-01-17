//@ts-check
import { exists, existsSync, readFileSync } from "fs";
import { extname, join, basename } from "path";

import PrerenderSPAPlugin, { PuppeteerRenderer } from "prerender-spa-plugin";
const Renderer = PuppeteerRenderer;

const CONFIG_OBJ_PATH = "pluginOptions.prerenderSpa";

export default entry;
module.exports = entry;

function entry(api, projectOptions) {
  api.chainWebpack(chain(api, projectOptions));
}

function chain(api, projectOptions) {
  return config => {
    const options = createPluginOptions(api, projectOptions);
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
        if (route[route.length - 1] !== "/" && extname(route) === "") {
          renderedRoute.outputPath = join(paths.outputDir || paths.staticDir, `${route}.html`);
        }
        const userPostProcess =
          options.postProcess && typeof options.postProcess === "function" ? options.postProcess : noop;
        return userPostProcess(renderedRoute);
      }
    };
    config.plugin("pre-render").use(PrerenderSPAPlugin, [prerenderOptions]);
    if (process.env.NODE_ENV === "production") {
      config.plugin("html").tap(args => {
        args[0].template = api.resolve("public/index.html");
        args[0].filename = "app.html";
        return args;
      });
    }
  };
}

function createRenderer(api, projectOptions) {
  const rendererConfig = createRendererConfig(api, projectOptions);
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
        if (!extname(req.url)) {
          const filePath = api.resolve(
            `${projectOptions.outputDir}${req.url}${basename(req.url) ? ".html" : "index.html"}`
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

function createRendererConfig(api, projectOptions) {
  let options = createPluginOptions(api, projectOptions);
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

function createPluginOptions(api, projectOptions) {
  let options;
  let oldConfigPath = api.resolve(".prerender-spa.json");
  try {
    options = pickle(projectOptions, CONFIG_OBJ_PATH);
    if (existsSync(oldConfigPath)) {
      Object.assign(options, JSON.parse(readFileSync(oldConfigPath).toString("utf-8")));
    }
  } catch (err) {
    if (existsSync(oldConfigPath)) {
      options = JSON.parse(readFileSync(oldConfigPath).toString("utf-8"));
    }
  }
  // return options; // TODO: Fix #16 permanently
  return Object.assign(options, { onlyProduction: true }); // Force disable on development build, workaround for #16
}

function resolvePaths(api, baseUrl, assetsDir) {
  return {
    outputDir: api.resolve(baseUrl),
    staticDir: api.resolve(baseUrl),
    assetsDir: api.resolve(join(baseUrl, assetsDir)),
    indexPath: api.resolve(join(baseUrl, process.env.NODE_ENV === "production" ? "app.html" : "index.html"))
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

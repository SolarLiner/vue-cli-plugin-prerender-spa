const path = require("path");
const PrerenderSPAPlugin = require("prerender-spa-plugin");
const Renderer = PrerenderSPAPlugin.PuppeteerRenderer;

module.exports = (api, projectOptions) => {
  const fs = require("fs");
  const options = JSON.parse(
    fs.readFileSync(api.resolve("./.prerender-spa.json", { encoding: "utf-8" }))
  );
  api.chainWebpack(config => {
    if (options.onlyProduction && process.env.NODE_ENV !== "production") {
      return;
    }
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

    const renderer = new Renderer(rendererConfig);
    renderer.preServer = (Prerenderer) => {
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
        server.get('*', (req, res, next) => {
          if (!path.extname(req.url)) {
            const filePath = api.resolve(`${projectOptions.outputDir}${req.url}${path.basename(req.url) ? '.html' : 'index.html'}`);
            fs.exists(filePath, (exists) => exists ? res.sendFile(filePath) : next());
            return;
          }
          next();
        })
      }
    };

    const outputDir = api.resolve(projectOptions.outputDir);
    const staticDir = api.resolve(projectOptions.outputDir);
    const prerenderOptions = {
      outputDir,
      staticDir,
      assetsDir: api.resolve(
        path.join(projectOptions.outputDir, projectOptions.assetsDir)
      ),
      indexPath: api.resolve(
        path.join(projectOptions.outputDir, projectOptions.indexPath)
      ),
      routes: options.renderRoutes,
      renderer
    };

    prerenderOptions.postProcess = (renderedRoute) => {
      const route = renderedRoute.route;
      if (route[route.length - 1] !== '/' && path.extname(route) === '') {
        renderedRoute.outputPath = path.join(outputDir || staticDir, `${route}.html`)
      }
      return renderedRoute;
    }

    config.plugin("pre-render").use(PrerenderSPAPlugin, [
      prerenderOptions
    ]);
  });
};

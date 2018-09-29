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
    if (projectOptions.baseUrl) {
      renderer.preServer = (Prerenderer) => {
        const prefix = projectOptions.baseUrl;
        Prerenderer._server._expressServer.use((req, res, next) => {
          if (req.url.indexOf(prefix) === 0) {
            req.url = req.url.slice(prefix.length - 1);
          }
          next();
        });
      };
    }

    config.plugin("pre-render").use(PrerenderSPAPlugin, [
      {
        outputDir: api.resolve(projectOptions.outputDir),
        staticDir: api.resolve(projectOptions.outputDir),
        assetsDir: api.resolve(
          path.join(projectOptions.outputDir, projectOptions.assetsDir)
        ),
        indexPath: api.resolve(
          path.join(projectOptions.outputDir, projectOptions.indexPath)
        ),
        routes: options.renderRoutes,
        renderer
      }
    ]);
  });
};

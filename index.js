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
    if (options.deferScripts) {
      rendererConfig.postProcess = route => {
        route.html = route.html
          .replace(/<script (.*?)>/g, "<script $1 defer>")
          .replace('id="app"', 'id="app" data-server-rendered="true"');

        return route;
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
        renderer: new Renderer(rendererConfig)
      }
    ]);
  });
};

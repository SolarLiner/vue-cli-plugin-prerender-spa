const path = require("path");
const PrerenderSPAPlugin = require("prerender-spa-plugin");
const Renderer = PrerenderSPAPlugin.PuppeteerRenderer;

module.exports = (api, projectOptions) => {
  const options = projectOptions["prerender-spa"];
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

    config.plugin("pre-render").use(PrerenderSPAPlugin, [
      {
        staticDir: api.resolve(config.assetsDir),
        indexPath: api.resolve(config.indexPath),
        routes: options.renderRoutes,
        renderer: new Renderer(rendererConfig)
      }
    ]);
  });
};

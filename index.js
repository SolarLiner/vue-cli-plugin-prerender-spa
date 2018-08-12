const path = require("path");
const PrerenderSPAPlugin = require("prerender-spa-plugin");
const Renderer = PrerenderSPAPlugin.PuppeteerRenderer;

module.exports = api => {
  api.chainWebpack(config => {
    if (options.onlyProduction && process.env.NODE_ENV !== "production") {
      return;
    }
    let rendererConfig = {
      headless: config.headless,
      maxConcurrentRoutes: config.parallel ? 4 : 1
    };
    if (config.useRenderEvent) {
      rendererConfig["renderAfterDocumentEvent"] = "x-app-rendered";
    }

    config.plugin("pre-render").use(PrerenderSPAPlugin, [
      {
        staticDir: api.resolve('./dist'),
        routes: options.renderRoutes,
        renderer: new Renderer(rendererConfig)
      }
    ]);
  });
};

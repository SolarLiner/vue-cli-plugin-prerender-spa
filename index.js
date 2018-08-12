const path = require("path");
const PrerenderSPAPlugin = require("prerender-spa-plugin");
const Renderer = PrerenderSPAPlugin.PuppeteerRenderer;

module.exports = (api, options) => {
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

    config.plugin("pre-render").use(PrerenderSPAPlugin, [
      {
        staticDir: api.resolve("./dist"),
        routes: options.renderRoutes,
        renderer: new Renderer(rendererConfig)
      }
    ]);
  });
};

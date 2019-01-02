module.exports = (api, options) => {
  api.extendPackage({
    devDependencies: {
      "prerender-spa-plugin": "^3.2.1"
    },
    vue: {
      pluginOptions: {
        prerenderSpa: options
      }
    }
  });

  api.onCreateComplete(() => {
    const fs = require("fs");

    if (options.useRenderEvent) {
      const ext = api.hasPlugin("typescript") ? "ts" : "js";
      const mainPath = api.resolve(`./src/main.${ext}`);

      const mainFileLines = fs
        .readFileSync(mainPath, { encoding: "utf-8" })
        .split(/\r?\n/g)
        .reverse();
      const vueRenderIndex = mainFileLines.findIndex(line =>
        line.match(/render\:/)
      );
      if (!mainFileLines[vueRenderIndex].endsWith(","))
        mainFileLines[vueRenderIndex] += ",";
      mainFileLines[vueRenderIndex] +=
        '\n  mounted: () => document.dispatchEvent(new Event("x-app-rendered")),';
      fs.writeFileSync(mainPath, mainFileLines.reverse().join("\n"), {
        encoding: "utf-8"
      });
    }
  });
};

module.exports = (api, options) => {
  api.extendPackage({
    devDependencies: {
      "prerender-spa-plugin": "^3.2.1"
    }
  });

  api.onCreateComplete(() => {
    const fs = require("fs");
    const configPath = api.resolve("./.prerender-spa.json");
    fs.writeFileSync(configPath, JSON.stringify(options), {
      encoding: "utf-8"
    });

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
        '\n  mounted: () => document.dispatch(new Event("x-app-rendered")),';
      fs.writeFileSync(mainPath, mainFileLines.reverse().join("\n"), {
        encoding: "utf-8"
      });
    }
  });
};

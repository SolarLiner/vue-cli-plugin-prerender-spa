module.exports = [
  {
    name: "renderRoutes",
    type: "input",
    message: "Which routes to pre-render? (list them separated by a comma)",
    default: "/",
    /**
     * @param {String} input
     */
    filter: input =>
      new Promise((resolve, reject) => {
        const dataArray = input.split(",").map(value => value.trim());
        const dataUnique = dataArray.filter((value, pos, self) => {
          return self.indexOf(value) === pos;
        })
        resolve(dataUnique);
      })
  },
  {
    name: "useRenderEvent",
    type: "confirm",
    message: "Use a render event to trigger the snapshot?",
    default: true
  },
  {
    name: "headless",
    type: "confirm",
    message: "Use a headless browser to render the application? (recommended)",
    default: true
  },
  {
    name: "onlyProduction",
    type: "confirm",
    message: "Only use prerendering for production builds? (recommended)",
    default: true
  }
];

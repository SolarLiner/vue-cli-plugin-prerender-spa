
module.exports = function stringifyJS(obj) {
  const stringify = require("javascript-stringify");

  return stringify(obj, (value) => {
    if (value && value.__expression) {
      return value.__expression;
    }
    return value;
  }, 2);
}

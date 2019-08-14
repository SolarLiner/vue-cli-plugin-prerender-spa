const { parse, print, types, visit } = require("recast");
const b = types.builders;

export default generate;
module.exports = generate;

function generate(api, options) {
  api.onCreateComplete(() => {
    const fs = require("fs");

    if (options.useRenderEvent) {
      const ext = api.hasPlugin("typescript") ? "ts" : "js";
      const mainPath = api.resolve(`./src/main.${ext}`);
      const orig = parse(fs.readFileSync(mainPath, { encoding: "utf-8" }));
      astMutAddEventPolyfill(orig);
      visit(orig, {
        visitNewExpression(path) {
          const stmt = path.node;
          if (stmt.callee.type === "Identifier" && stmt.callee.name === "Vue") {
            const idx = stmt.arguments.findIndex(a => a.type === "ObjectExpression");
            if (idx !== -1) {
              stmt.arguments.splice(idx, 1, astInsertMountedHook(stmt.arguments[idx]));
            }
          }

          this.traverse(path);
        }
      });
      fs.writeFileSync(mainPath, print(orig).code, { encoding: "utf-8" });
    }
  });

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
}

function astMutAddEventPolyfill(source) {
  const polyfill = parse(`function createNewEvent(eventName) {
    var event;
    if (typeof(Event) === 'function') {
        event = new Event(eventName);
    } else {
        event = document.createEvent('Event');
        event.initEvent(eventName, true, true);
    }
    return event;
}
`);
  const idx = source.program.body.findIndex(n => n.type === "ExpressionStatement");
  if (idx !== -1) {
    source.program.body.splice(idx, 0, ...polyfill.program.body);
  } else {
    source.program.body.append(...polyfill.program.body);
  }
}

/**
 *
 * @param {types.namedTypes.ObjectExpression} obj
 */
function astInsertMountedHook(obj) {
  const appProperties = Object.assign({}, obj);
  const mountedHookIdx = appProperties.properties.findIndex(p => p.key.name === "mounted");
  if (mountedHookIdx !== -1) {
    const prop = appProperties.properties[mountedHookIdx];
    switch (prop.value.type) {
      case "FunctionExpression":
        prop.value.body = astInsertEventInBlock(prop.value.body);
        break;
      case "ArrowFunctionExpression":
        if (prop.value.body.type === "BlockStatement") {
          prop.value.body = astInsertEventInBlock(prop.value.body);
        } else {
          prop.value = b.blockStatement([
            b.variableDeclaration("const", [b.variableDeclarator(b.identifier("result"), prop.value.body)]),
            astDispatchRenderEvent(),
            b.returnStatement(b.identifier("result"))
          ]);
        }
        break;
      default:
        // Invalid type for Vue, overwriting
        console.error("WARNING: Invalid type for mounted hook of Vue root component, overwriting...");
        prop.value = b.blockStatement([astDispatchRenderEvent()]);
    }
    appProperties.properties.slice(mountedHookIdx, 1, prop);
  } else {
    appProperties.properties.push(
      b.property(
        "init",
        b.identifier("mounted"),
        b.arrowFunctionExpression([], b.blockStatement([astDispatchRenderEvent()]))
      )
    );
  }

  return appProperties;
}

function astInsertEventInBlock(astBlock) {
  const retIdx = astBlock.body.findIndex(n => n.type === "ReturnStatement");
  if (retIdx === -1) {
    return b.blockStatement([...astBlock.body, astDispatchRenderEvent()]);
  } else {
    let astReturnStmt = astBlock.body[retIdx].argument;
    const astRetVal = b.variableDeclaration("const", [b.variableDeclarator(b.identifier("result"), astReturnStmt)]);
    astReturnStmt = b.returnStatement(b.identifier("result"));
    let retval = astBlock.body.slice();
    retval.splice(retIdx, 1, astRetVal, astDispatchRenderEvent(), astReturnStmt);
    return b.blockStatement(retval);
  }
}

function astDispatchRenderEvent() {
  return b.expressionStatement(b.callExpression(b.identifier("createNewEvent"), [b.literal("x-app-rendered")]));
}

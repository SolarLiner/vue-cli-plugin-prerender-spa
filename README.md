# vue-cli-plugin-prerender-spa

Add `prerender-spa-plugin` into your Vue application with zero configuration.

## Install

Add prerendering to your Vue application with:

```bash
vue add prerender-spa
```

or by searching for `prerender-spa` in the Vue UI plugins.

You'll be asked a few questions, detailed below, to which the default answers
are the most common options.

The main option to fit to your needs is the **list of routes to pre-render**.
Speccify them as a comma-separated list:

```bash
? Which routes to pre-render? (list them separated by a comma) /,/about,/contact
```

## Options list

### Pre-rendered routes

```bash
? Which routes to pre-render? (list them separated by a comma) /
```

Specify a list of routes to pre-render. By default only the index page is pre-
rendered, which should cover most SPAs. If your project uses vue-router, you
can specify a list of routes that do not depend on dynamic content (like user
uploaded data, public profiles, etc.). For example you can add your about page
as well as a contact page - those will load faster, and will be indexed by bots
who do not execute JavaScript, improving Search Engines rankigs.

Note that if you want to also pre-render user generated content, you *will*
have to switch to Server-Side Rendering, there are no other options.

#### What it does to your project

The list of routes is split into an array and passed into the Webpack plugin.
The routes aren't checked for existence or even duplicates, just split into an
array and sent to the `PrerenderSPAPlugin` instance.

### Event-triggered snapshot

```bash
? Use a render event to trigger the snapshot? Yes
```

Use a document event to signal `prerender-spa-plugin` to trigger a snapshot of
the DOM and save it. By default the renderer waits until `DOMContentLoaded` to
take a snapshot of the DOM. But it is still recommended that you control the
snapshot trigger - no surprise waiting for hours for your build before
realizing what's happening.

#### What it does to your project

When enabling the event-based snapshot trigger, it will tell
`PrerenderSPAPlugin` to listen for an `x-app-rendered` event. Your main file
is then modified to add a `mounted()` hook where the even will fire. Note that
it doesn't check if the hook is already present, nor does it parses the file;
it just looks for the line starting with `render:` (minus whitespaces) and
inserts the `mounted()` hook below. If you already have the hook set up, or if
your `render()` function on the main file is longer than one line, it will break
your Vue entrypoint. A better injection routine is planned, but for now, it
covers a vast majority of projects where the main file isn't touched.

### Use a headless browser for rendering

```bash
? Use a headless browser to render the application (recommended) Yes
```

This option is there for debugging purposes, but **should not be enabled**
otherwise. Not using a headless browser will open a Chrome window when building
with your app running inside, then close once the snapshot has been taken.
Since the plugin configuration object isn't available, it is available here.

#### What it does to your project

The `headless` value of the configuration object is set to the answer to the question.

### Only pre-render for production builds

```bash
? Only use prerendering for production builds? (recommended) Yes
```

Only load the pre-rendering plugin when building for production. This is
strongly recommended as the plugin, spawning an instance of the Chrome browser,
adds significant time to the build process. Development builds should be snappy
and not memory-intensive; which is exactly what this plugin does to your build.

However, there may be cases where you want to test the pre-rendering itself,
and switching to a production build isn't the solution - you may then turn off
that option.

### Indirect options

#### Parallel / Mutli-threaded

This option is configured from within the Vue CLI itself, but serves to a whole
host of plugins to determine whether to turn on parallel jobs / multi-threading.

This plugin uses it to tell `prerender-spa-plugin` to render pages concurently
(meaning in parallel) or not by setting the `maxConcurrentRoutes` parameter to
either 1 or 4, if the build is respectively single-threaded or multi-threaded.

## Contributing

You are very welcome to contribute. To ask for a feature, or submit a bug, use
the Issues list. If you want to contribute a feature yourself, first submit an
Issue, work on your code, and add a Pull Request, referencing your issue in the
PR message. This way the isse can serve as a mean to discuss the feature, and
the Pull Request is where we can review the code and talk specificities.

In all cases, follow the templates carefully, in order to maximize information
throughput.

## Notices

### CI/CD workflows

Because the `prerender-spa-plugin` uses a headless Chrome instance, your
regular `node:latest` Docker image will not chug your build correctly; you need
system dependencies and configuration that might not be efficient to add to the
job itself - rather, it is recommended to switch to a Node.js + Puppetteer
image where you can just use your `install && build` workflow without any
additional configuration. I personally use  the `alekzonder/puppeteer` image.

### Compatibility with other Vue CLI plugins

This plugin should be compatible with any plugin that doesn't add a `mounted()`
hook into the Vue entrypoint in your `main.{js,ts}` file, as this is the only
file it updates, and only if you choose an event-based snapshot trigger.

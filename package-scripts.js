var npsUtils = require("nps-utils");
var path = require("path");

module.exports = {
  scripts: {
    server: {
      dev: {
        ts: "webpack-dev-server --config ./config/webpack/demo/webpack.config.dev-ts.js --colors",
        default:
          "webpack-dev-server --config ./config/webpack/demo/webpack.config.dev.js --colors --content-base demo/js"
      },
      hot:
        "webpack-dev-server --config ./config/webpack/demo/webpack.config.hot.js --colors --inline --hot --content-base demo/js",
      test: "webpack-dev-server --config ./config/webpack/webpack.config.test.js --colors"
    },
    karma: {
      ci:
        "karma start --browsers ChromeHeadlessCustom,Firefox ./config/karma/karma.conf.coverage.js",
      cov: "karma start ./config/karma/karma.conf.coverage.js",
      default: "karma start ./config/karma/karma.conf.js"
    },
    test: {
      cov: npsUtils.series.nps("build-package-libs", "karma.cov"),
      dev: "karma start ./config/karma/karma.conf.dev.js",
      default: npsUtils.series.nps("build-package-libs", "karma")
    },
    storybook: {
      server: "start-storybook -p 6006",
      default: npsUtils.concurrent.nps("watch", "storybook.server")
    },
    start: {
      ts: npsUtils.concurrent.nps("watch", "server.dev.ts"),
      default: npsUtils.concurrent.nps("watch", "server.dev", "server.test")
    },
    lint: {
      src: "lerna exec --stream -- eslint --color --ext .js,.jsx,.ts,.tsx src",
      demo: "eslint --color --ext .js,.jsx,.ts,.tsx demo",
      stories: "eslint --color stories",
      test: "eslint --color test",
      ts: npsUtils.series.nps("build-package-libs", "compile-ts"),
      default: npsUtils.series.nps("lint.test", "lint.stories", "lint.demo", "lint.src")
    },
    format: {
      default: 'prettier --write "./**/*.{js,jsx,json,ts,tsx}"',
      ci: 'prettier --list-different "./**/*.{js,jsx,json,ts,tsx}"'
    },
    check: {
      ci: npsUtils.series.nps("format.ci", "lint", "build-package-libs", "karma.ci", "compile-ts"),
      cov: npsUtils.series.nps("lint", "test.cov"),
      dev: npsUtils.series.nps("lint", "test.dev"),
      default: npsUtils.series.nps("lint", "test")
    },
    watch: {
      es:
        "lerna exec --parallel -- cross-env BABEL_ENV=es babel src --out-dir es --copy-files --watch",
      lib:
        "lerna exec --parallel -- cross-env BABEL_ENV=lib babel src --out-dir lib --copy-files --watch",
      default: npsUtils.concurrent.nps("watch.es", "watch.lib")
    },
    clean: {
      lib: "rimraf lib",
      es: "rimraf es",
      dist: "rimraf dist",
      default: npsUtils.concurrent.nps("clean.es", "clean.lib", "clean.dist"),
      all: "lerna exec --parallel -- nps clean"
    },
    "compile-ts": "tsc --project tsconfig.json --noEmit",
    // Version testing helpers
    "lerna-dry-run": "lerna publish --skip-git --skip-npm --loglevel silly",
    // TODO: organize build scripts once build perf is sorted out
    "babel-es": "cross-env BABEL_ENV=es babel src --out-dir es --copy-files",
    "babel-lib": "cross-env BABEL_ENV=commonjs babel src --out-dir lib --copy-files",
    "build-es": npsUtils.series.nps("clean.es", "babel-es"),
    "build-lib": npsUtils.series.nps("clean.lib", "babel-lib"),
    "build-libs": npsUtils.series.nps("build-lib", "build-es"),
    "build-package-libs": "lerna exec --parallel -- nps build-libs",
    "build-dist-dev": "webpack --bail --config ../../config/webpack/webpack.config.dev.js --colors",
    "build-dist-min": "webpack --bail --config ../../config/webpack/webpack.config.js --colors",
    "build-dists": npsUtils.concurrent.nps("build-dist-min", "build-dist-dev"),
    "build-dist": npsUtils.series.nps("clean.dist", "build-dists")
  }
};

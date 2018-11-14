const LOG_LEVELS = [
  "error",
  "warn",
  "highlight",
  "info",
  "log",
  "debug",
  "deepDebug"
];
const console = require("./console");
const argument = require("ezzy-argument");
const DEFAULT_LEVEL = argument(["LOG_LEVEL", "NODE_LOG_LEVEL"], "info");
const BORING_LOG = argument("BORING_LOG", "false") !== "false";
const USE_CONSOLE_LOG = argument("USE_CONSOLE_LOG", "false") !== "false";
const HIDE_ARGUMENTS = argument("HIDE_ARGUMENTS", "false") !== "false";
const path = require("path");
const callsite = require("callsite");
const clc = require("cli-color");
const configSetup = require("ezzy-config-setup");
const DEBUG_LEVEL = LOG_LEVELS.indexOf("debug");
const INFO_LEVEL = LOG_LEVELS.indexOf("info");
const LOG_LEVEL = LOG_LEVELS.indexOf("log");
const HIGHLIGHT_LEVEL = LOG_LEVELS.indexOf("highlight");
const DEEP_DEBUG_LEVEL = LOG_LEVELS.indexOf("deepDebug");
const WARN_LEVEL = LOG_LEVELS.indexOf("warn");
const ERROR_LEVEL = LOG_LEVELS.indexOf("error");
const trueTypeOf = require("ezzy-typeof");
const isBrowser = !process || !process.argv;

/**
 * The throttle timeouts.
 *
 * @type {object}
 * @private
 */
const _throttle = {};

/**
 * A logger class that spits out log entries into the console colored and
 * stylized in different ways depending on the level.
 */
class Logger {
  /**
   * @param {string|number} level The default start level.
   * @param {boolean} silent If the logger should start silent.
   */
  constructor(level = DEFAULT_LEVEL, silent = false) {
    /**
     * Indicates if we should be silent.
     *
     * @type {boolean}
     * @private
     */
    this.silent = silent;

    /**
     * Checks if the current logging is groupped.
     * @type {boolean}
     */
    this.isGroupped = false;

    /**
     * The level of logging.
     *
     * @type {string}
     * @private
     */
    this._level = LOG_LEVELS.indexOf(level);

    /**
     * The levels of logging.
     * @type {string[]}
     */
    this.LEVELS = LOG_LEVELS;

    /**
     * Indicates if the log should be boring (no colors).
     * @type {boolean}
     */
    this._boring = BORING_LOG;

    /**
     * Check if we should use the native console log.
     * @type {boolean}
     * @private
     */
    this._consoleLog = USE_CONSOLE_LOG;

    /**
     * The group title. This can be updated by starting a new group and
     * every log after that will contain this title.
     * @type {string}
     * @private
     */
    this._groupTitle = "";

    // Inform the debugging status.
    if (!HIDE_ARGUMENTS) {
      Logger.console.log(
        "[LOG] Logging level set to " +
          this._level +
          " | is " +
          (this.isDebugging ? "" : "not") +
          " debugging | is " +
          (this.silent ? "" : "not") +
          " silent"
      );
    }
  }

  /**
   * Globalizes the console for other use.
   */
  static globalize() {
    if (!isBrowser) {
      throw "Console globalization is not available.";
    }
    window._console = console;
    window.console = Logger.logger;
  }

  /**
   * Obtains the necessary console.
   * @returns {*}
   */
  static get console() {
    if (isBrowser) {
      return window._console || window.console;
    } else {
      return console;
    }
  }

  /**
   * Obtains the default instance.
   * @returns {Logger}
   */
  static get logger() {
    if (!this._inst) {
      this._inst = new Logger();
    }
    return this._inst;
  }

  /**
   * Obtains a new instance of the logger.
   * @param {string|number=} level The initial level of the logger.
   * @param {boolean=} silent If the logger should start silent.
   * @returns {Logger}
   */
  static getLogger(level, silent) {
    return new Logger(level, silent);
  }

  /**
   * Sets the level of logging.
   * @param {*} level The new level
   */
  set level(level) {
    if (!HIDE_ARGUMENTS) {
      Logger.console.log(
        ...this.color(
          "magentaBright",
          `[LOG] Requested logging level to change to '${level}'`,
          true
        )
      );
    }
    if (isNaN(level)) {
      const index = LOG_LEVELS.indexOf(level);
      this._level = index > -1 ? index : 0;
    } else {
      this._level = parseInt(level);
    }
  }

  /**
   * Gets the level.
   * @returns {number}
   */
  get level() {
    return this._level;
  }

  /**
   * Changes the boring state.
   * @param {boolean} value If the log should be boring.
   */
  set boring(value) {
    this._boring = Boolean(value);
  }

  /**
   * Setter of the value to use the native console log.
   * @param value
   */
  set consoleLog(value) {
    this._consoleLog = Boolean(value);
  }

  /**
   * Turns a message into a colored message.
   * @param {string} color The color of the message.
   * @param {string} msg The string to color.
   * @param {boolean} bold If the message should be bold.
   * @returns {string[]}
   */
  color(color, msg, bold = false) {
    if (this._boring) {
      return [msg];
    }
    if (!color) {
      return [msg];
    }
    if (isBrowser) {
      if (color === "blackBright") {
        color = "gray";
      } else if (color.includes("Bright")) {
        color = color.replace("Bright", "");
      }
      return [
        `%c ${msg}`,
        `color:${color};font-weight:${bold ? "bold" : "normal"}`
      ];
    } else if (bold) {
      return [clc[color].bold(msg)];
    } else {
      return [clc[color](msg)];
    }
  }

  /**
   * Concatenates the type of log into a single string for the console.
   *
   * @param {string} logType The log type.
   * @param {string} methodName The console method to use.
   * @param {string} debugColor Color to use for the console.
   * @param {Arguments} args The arguments to check as configuration.
   */
  doLog(logType, methodName, debugColor, args) {
    if (this._consoleLog) {
      methodName = "log";
    }
    const config = configSetup(
      {
        title: "",
        message: "",
        msg: "",
        data: null,
        type: "",
        color: debugColor,
        indent: 0,
        prefix: true,
        suffix: this.isDebugging,
        marginTop: 0,
        marginBottom: 0,
        paddingBottom: 0,
        paddingTop: 0,
        borderTop: 0,
        borderBottom: 0,
        borderChar: "-",
        ts: false,
        timestamp: false,
        muted: false,
        stack: null,
        error: null,
        basics: undefined
      },
      args,
      ["message:error|string|function"],
      ["title:string", "message:string|function"],
      ["basics:object", "message:string|function"],
      ["title:string", "error:error"],
      ["title:string", "data:object|array|number|boolean"],
      ["title:string", "message:string|function", "error:error"],
      ["title:string", "message:string|function", "data:*"],
      ["basics:object", "title:string", "message:string|function"],
      ["basics:object", "message:string", "data:*"],
      [
        "basics:object",
        "title:string",
        "message:string|function",
        "error:error"
      ],
      ["basics:object", "title:string", "message:string|function", "data:*"],
      ["this:object"]
    );
    let i;
    let border;

    config.message = config.message || config.msg;

    if (!isBrowser) {
      const tto = trueTypeOf(config.message);

      if (tto === "error") {
        config.stack = config.message.stack;
        config.message = config.message.message;
      } else if (tto === "function") {
        config.message = config.message();
      }
      if (tto === "object") {
        config.message = JSON.stringify(config.message);
      }

      if (config.error) {
        if (config.message) {
          config.message = `${config.message} [${config.error.message}]`;
        } else {
          config.message = config.error.message;
        }
        if (config.error.stack) {
          config.message = config.error.stack;
        }
      }

      if (config.data) {
        config.message += " " + JSON.stringify(config.data);
      }

      if (config.message === "") {
        return;
      }

      if (config.type !== "") {
        config.type = `[${config.type}] `;
      }

      if (config.title) {
        config.message = `[${config.title}] ${config.message}`;
      } else if (this._groupTitle) {
        config.message = `[${this._groupTitle}] ${config.message}`;
      }

      if (
        config.basics &&
        config.basics.request &&
        config.basics.request.loggerPrefix
      ) {
        config.message = `[${config.basics.request.loggerPrefix}] ${
          config.message
        }`;
      }

      if (config.prefix) {
        config.message = `[${logType}] ${config.type}${config.message}`;
      }

      if (typeof config.suffix === "string") {
        config.message += this.color("blackBright", ` (${config.suffix})`)[0];
      } else if (config.suffix) {
        config.message += this.color(
          "blackBright",
          ` (${this._getLastLine()})`
        )[0];
      }

      if (config.ts || config.timestamp) {
        config.message += this.color("blackBright", ` > ${Date.now()}`)[0];
      }

      if (config.muted) {
        config.message = this.color("blackBright", config.message)[0];
      } else if (config.color) {
        config.message = this.color(config.color, config.message)[0];
      }
    }

    if (config.marginTop) {
      for (i = 0; i < config.marginTop; i++) {
        Logger.console[methodName]("");
      }
    }

    if (config.borderTop || config.borderBottom) {
      border = this.color(
        config.color,
        new Array(Math.max(config.borderTop, config.borderBottom)).join(
          config.borderChar
        )
      );
    }

    if (config.borderTop) {
      Logger.console[methodName](...border);
    }

    if (config.paddingTop) {
      for (i = 0; i < config.paddingTop; i++) {
        Logger.console[methodName]("");
      }
    }

    const indentation = !config.indent
      ? ""
      : typeof config.indent === "number"
      ? new Array(config.indent).join(" ")
      : config.indent;
    if (isBrowser) {
      let msg = indentation + `[${logType}]`;
      if (config.title) {
        msg += " " + config.title;
      }
      if (config.msg) {
        msg += " " + config.msg;
      } else if (config.message) {
        msg += " " + config.message;
      }

      if (config.timestamp || config.ts) {
        msg += " " + Date.now().toString();
      }
      Logger.console[methodName](...this.color(config.color, msg), config.data);
    } else {
      Logger.console[methodName](indentation + config.message);
    }

    if (config.stack) {
      Logger.console[methodName](...this.color(config.color, config.stack));
    }

    if (config.paddingBottom) {
      for (i = 0; i < config.paddingBottom; i++) {
        Logger.console[methodName]("");
      }
    }

    if (config.borderBottom) {
      Logger.console[methodName](...border);
    }

    if (config.marginBottom) {
      for (i = 0; i < config.marginBottom; i++) {
        Logger.console[methodName]("");
      }
    }
  }

  /**
   * Obtains the last line called in the stack trace.
   * @returns {string}
   * @private
   */
  _getLastLine() {
    /**
     * @type {{
     *  getFileName: function,
     *  getLineNumber: function,
     *  getColumnNumber: function
     * }}
     */
    try {
      const call = callsite().find(
        l => !/(index|Logger)\.js$/.test(l.getFileName())
      );
      const fileName = path.basename(call.getFileName());
      const colNo = call.getColumnNumber();
      const lineNo = call.getLineNumber();
      return `${fileName} ${lineNo}:${colNo}`;
    } catch (e) {
      return "";
    }
  }

  /**
   * Shortcut to the globalization method.
   */
  globalize() {
    Logger.globalize();
  }

  /**
   * Toggles the groupping.
   * @param {*} args
   * @returns {Logger}
   */
  group(...args) {
    return this.groupStart(...args);
  }

  /**
   * Shortcut for group end.
   * @returns {*}
   */
  ungroup(...args) {
    return this.groupEnd();
  }

  /**
   * Shortcut for group end.
   * @returns {*}
   */
  done() {
    return this.groupEnd();
  }

  /**
   * Starts a group.
   * @param args
   * @returns {Logger}
   */
  groupStart(...args) {
    if (this.isGroupped) {
      this.groupEnd();
    }
    Logger.console.group(...args);
    // Save the second argument as the title of the group.
    if (args.length && typeof args[0] === "string") {
      this._groupTitle =
        args[0].length > 25 ? `${args[0].substr(0, 22)}...` : args[0];
    } else {
      this._groupTitle = "";
    }
    this.isGroupped = true;
    return this;
  }

  /**
   * Ends a group.
   * @returns {Logger}
   */
  groupEnd() {
    Logger.console.groupEnd();
    this._groupTitle = "";
    this.isGroupped = false;
    return this;
  }

  /**
   * Sets the logger to silence.
   *
   * @returns {Logger}
   */
  silence() {
    this.silent = true;
    return this;
  }

  /**
   * Sets the logger to talk.
   *
   * @returns {Logger}
   */
  talk() {
    this.silent = false;
    return this;
  }

  /**
   * Checks if we're debugging.
   *
   * @returns {boolean}
   */
  get isDebugging() {
    return this._level >= DEBUG_LEVEL;
  }

  /**
   * Sends a highlight info log to the console.
   * @returns {Logger}
   */
  highlight() {
    if (!this.silent && this._level >= HIGHLIGHT_LEVEL) {
      this.doLog.call(this, "HGH", "info", "yellowBright", arguments);
    }
    return this;
  }

  /**
   * Sends a debug log into the console.
   * @returns {Logger}
   */
  debug() {
    if (!this.silent && this.isDebugging) {
      this.doLog.call(this, "DBG", "debug", "magenta", arguments);
    }
    return this;
  }

  /**
   * Sends a deep debug log into the console.
   * @returns {Logger}
   */
  deepDebug() {
    if (!this.silent && this._level >= DEEP_DEBUG_LEVEL) {
      this.doLog.call(this, "DBG", "debug", "blackBright", arguments);
    }
    return this;
  }

  /**
   * Sends an info log into the console.
   * @returns {Logger}
   */
  info() {
    if (!this.silent && this._level >= INFO_LEVEL) {
      this.doLog.call(this, "INF", "info", null, arguments);
    }
    return this;
  }

  /**
   * Sends a simple log into the console.
   * @returns {Logger}
   */
  log() {
    if (!this.silent && this._level >= LOG_LEVEL) {
      this.doLog.call(this, "LOG", "log", null, arguments);
    }
    return this;
  }

  /**
   * Sends a warning log into the console.
   * @returns {Arguments}
   */
  warn() {
    if (!this.silent && this._level >= WARN_LEVEL) {
      this.doLog.call(this, "WRN", "warn", "yellow", arguments);
    }
    return this;
  }

  /**
   * Sends an error log into the console.
   * @returns {Logger}
   */
  error() {
    if (!this.silent && this._level >= ERROR_LEVEL) {
      this.doLog.call(this, "ERR", "error", "red", arguments);
    }
    return this;
  }

  /**
   * Sends a fatal log into the console and throws a new error.
   * @throws {TypeError}
   */
  fatal(...args) {
    if (!this.silent) {
      this.doLog("ERR", "error", "red", ...args);
    }
    throw new TypeError(args[0]);
  }

  /**
   * Shortcut to assertion.
   * @param {*} val Values to assert.
   * @returns {boolean}
   */
  assert(...val) {
    if (val.every(item => !!item)) {
      return true;
    }
    this.warn("Assertion Failed: There is a falsy value");
    return false;
  }

  /**
   * Asserts that one value is truthy.
   * @param {*} val Values to assert.
   * @returns {boolean}
   */
  assertOne(...val) {
    if (val.findIndex(item => !!item) > -1) {
      return true;
    }
    this.warn("Assertion Failed: No values are truthy");
    return false;
  }

  /**
   * Asserts that only one value is defined.
   * @param {*} val1 Value one to be compared.
   * @param {*} val2 Value two to be compared.
   * @returns {boolean}
   */
  assertOnlyOne(val1, val2) {
    if (!!val1 === !val2) {
      return true;
    }
    this.warn(`Assertion Failed: '${val1}' is similar to '${val2}'`);
    return false;
  }

  /**
   * Asserts that 2 values are equal.
   * @param {*} a The first value.
   * @param {*} b The second value.
   * @returns {boolean}
   */
  assertEqual(a, b) {
    if (a !== b) {
      this.warn(`Assertion Failed: Value ${a} is not equal to ${b}`);
      return false;
    }
    return true;
  }

  /**
   * Asserts that value a is greater than value b.
   * @param {*} a The first value.
   * @param {*} b The second value.
   * @returns {boolean}
   */
  assertGreaterThan(a, b) {
    if (a <= b) {
      this.warn(`Assertion Failed: Value ${a} is not greater than ${b}`);
      return false;
    }
    return true;
  }

  /**
   * Asserts that value a is less than value b.
   * @param {*} a The first value.
   * @param {*} b The second value.
   * @returns {boolean}
   */
  assertLessThan(a, b) {
    if (a >= b) {
      this.warn(`Assertion Failed: Value ${a} is not smaller than ${b}`);
      return false;
    }
    return true;
  }

  /**
   * Asserts that 2 values are not equal.
   * @param {*} a The first value.
   * @param {*} b The second value.
   * @returns {boolean}
   */
  assertNotEqual(a, b) {
    if (a === b) {
      this.warn(`Assertion Failed: Value '${a}' is equal to '${b}'`);
      return false;
    }
    return true;
  }

  /**
   * Asserts that the values has a length (array/string).
   * @param {*} val The first value.
   * @returns {boolean}
   */
  assertLength(...val) {
    for (let i = 0; i < val.length; i++) {
      if (!val[i].length) {
        this.warn(`Assertion Failed: Value '${val[i]}' has no length`);
        return false;
      }
    }
    return true;
  }

  /**
   * Asserts that a value is a type.
   * @param {*} value A value to assert.
   * @param {string} type The true type of the value.
   * @returns {boolean}
   */
  assertType(value, type) {
    if (trueTypeOf(value) !== type) {
      this.warn(`Assertion Failed: Value ${value} is not ${type}`);
      return false;
    }
    return true;
  }

  /**
   * Throttles a message to be logged and logs it once.
   * @param msg
   * @param timeout
   * @param method
   */
  throttle(msg, timeout = 1000, method = "log") {
    const key = method + (msg.message || msg);
    if (_throttle[key]) {
      clearTimeout(_throttle[key]);
    } else {
      this[method](msg);
    }
    const self = this;
    _throttle[key] = setTimeout(
      function() {
        self[this.method](
          Object.assign(this.msg, {
            suffix: "Throttled - " + self._getLastLine()
          })
        );
        delete _throttle[this.key];
      }.bind({
        key,
        method: method,
        msg: typeof msg === "string" ? { message: msg } : msg
      }),
      timeout
    );
    return this;
  }

  /**
   * Shortcut to throttle debug.
   * @param msg
   * @param timeout
   * @returns {Logger}
   */
  debugThrottle(msg, timeout) {
    this.throttle(msg, timeout, "debug");
    return this;
  }

  /**
   * Shortcut to throttle deep debug.
   * @param msg
   * @param timeout
   * @returns {Logger}
   */
  deepDebugThrottle(msg, timeout) {
    this.throttle(msg, timeout, "deepDebug");
    return this;
  }

  /**
   * Shortcut to throttle log.
   * @param msg
   * @param timeout
   * @returns {Logger}
   */
  logThrottle(msg, timeout) {
    this.throttle(msg, timeout, "log");
    return this;
  }

  /**
   * Shortcut to throttle info.
   * @param msg
   * @param timeout
   * @returns {Logger}
   */
  infoThrottle(msg, timeout) {
    this.throttle(msg, timeout, "info");
    return this;
  }

  /**
   * Shortcut to throttle debug.
   * @param msg
   * @param timeout
   * @returns {Logger}
   */
  highlightThrottle(msg, timeout) {
    this.throttle(msg, timeout, "highlight");
    return this;
  }

  /**
   * Shortcut to throttle debug.
   * @param msg
   * @param timeout
   * @returns {Logger}
   */
  warnThrottle(msg, timeout) {
    this.throttle(msg, timeout, "warn");
    return this;
  }

  /**
   * Shortcut to throttle error.
   * @param msg
   * @param timeout
   * @returns {Logger}
   */
  errorThrottle(msg, timeout) {
    this.throttle(msg, timeout, "error");
    return this;
  }

  /**
   * Logs the output of an child_process.exec command.
   * @param {Error} e Any errors that might have ocurred.
   * @param {Buffer} stdout The output of the exec command.
   * @param {Buffer} stderr The error of the exec command.
   */
  fromExec(e, stdout, stderr) {
    if (e) {
      Logger.logger.error(e);
    }
    if (stdout) {
      Logger.logger.debug(stdout);
    }
    if (stderr) {
      Logger.logger.error(stderr);
    }
  }
}

module.exports = Logger;

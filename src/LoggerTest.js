let log = jasmine.createSpy();
let warn = jasmine.createSpy();
let debug = jasmine.createSpy();
let info = jasmine.createSpy();
let error = jasmine.createSpy();
let group = jasmine.createSpy();
let groupEnd = jasmine.createSpy();
let groupStart = jasmine.createSpy();
const Logger = require("proxyquire")
  .noCallThru()
  .load("./Logger", {
    "./console": { log, warn, debug, info, error, group, groupEnd, groupStart }
  });
const { exec } = require("child_process");
let logger;

describe("Logger", () => {
  beforeEach(() => {
    logger = Logger.logger;
  });

  it("should only invoke one instance of logger", done => {
    expect(Logger.logger).toBe(Logger.logger);
    done();
  });

  it("should display if it is debugging", done => {
    logger.level = "debug";
    expect(logger.isDebugging).toBe(true);
    logger.level = "info";
    expect(logger.isDebugging).toBe(false);
    done();
  });

  it("should log with the correct configuration", done => {
    logger.talk();
    logger.level = "deepDebug";
    logger.log("Test");
    expect(log.calls.mostRecent().args[0]).toMatch(/^\[LOG] Test.*$/);
    logger.log("Title", "Message");
    expect(log.calls.mostRecent().args[0]).toMatch(
      /^\[LOG] \[Title] Message.*$/
    );
    logger.log("Title", "Message", { asdf: true });
    expect(log.calls.mostRecent().args[0]).toMatch(
      /^\[LOG] \[Title] Message.*{"asdf":true}.*$/
    );
    const mockBasics = { request: { loggerPrefix: "reqPrefix" } };
    logger.log(mockBasics, "Title", "Message", { asdf: true });
    expect(log.calls.mostRecent().args[0]).toMatch(
      /^\[LOG] \[reqPrefix] \[Title] Message.*{"asdf":true}.*$/
    );
    logger.log(mockBasics, "Message", { asdf: true });
    expect(log.calls.mostRecent().args[0]).toMatch(
      /^\[LOG] \[reqPrefix] Message {"asdf":true}.*$/
    );
    done();
  });

  it("should have the default levels correct", done => {
    ["error", "warn", "highlight", "info", "log", "debug", "deepDebug"].forEach(
      (level, i) => {
        logger.level = level;
        expect(logger.level).toBe(i);
      }
    );
    done();
  });

  it("should throw a fatal error", done => {
    logger.talk();
    expect(() => {
      logger.fatal("hi");
    }).toThrow(new TypeError("hi"));
    logger.silence();
    done();
  });

  it("should silence and talk correctly", done => {
    logger.silence();
    logger.level = 'log';
    spyOn(logger, "doLog");
    logger.log("hi");
    expect(logger.doLog).toHaveBeenCalledTimes(0);
    logger.talk();
    logger.log("hi");
    expect(logger.doLog).toHaveBeenCalled();
    done();
  });

  it("should log properly", () => {
    expect(Logger.getLogger() instanceof Logger).toBe(true);
    expect(Logger.logger instanceof Logger).toBe(true);
    expect(logger._getLastLine()).toContain("LoggerTest");
    expect(logger.LEVELS).toEqual(jasmine.arrayContaining(["info"]));
    expect(logger.debug).toBeDefined();
    expect(logger.deepDebug).toBeDefined();
    expect(logger.highlight).toBeDefined();
    expect(logger.assert).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.error).toBeDefined();
    expect(logger.log).toBeDefined();
  });

  it("should return the same logger to be able to chain methods", () => {
    expect(logger.debug("asdf")).toBe(logger);
    expect(logger.deepDebug("asdf")).toBe(logger);
    expect(logger.highlight("asdf")).toBe(logger);
    expect(logger.warn("asdf")).toBe(logger);
    expect(logger.error("asdf")).toBe(logger);
    expect(logger.log("asdf")).toBe(logger);
  });

  it("should log proper information from an exec command", done => {
    spyOn(logger, "fromExec");
    exec("ls", logger.fromExec);
    setTimeout(() => {
      expect(logger.fromExec).toHaveBeenCalledWith(
        null,
        jasmine.anything(),
        ""
      );
      done();
    }, 100);
  });

  it("should properly log information", done => {
    logger.talk();
    spyOn(logger, "doLog");
    logger.level = "error";
    logger.deepDebug("hi");
    logger.debug("hi");
    logger.info("hi");
    logger.highlight("hi");
    logger.log("hi");
    logger.error("hi");
    logger.warn("hi");
    expect(logger.doLog).toHaveBeenCalledTimes(1);
    logger.level = "debug";
    logger.deepDebug("hi");
    logger.debug("hi");
    logger.info("hi");
    logger.highlight("hi");
    logger.log("hi");
    logger.error("hi");
    logger.warn("hi");
    expect(logger.doLog).toHaveBeenCalledTimes(7);
    logger.level = 10;
    logger.deepDebug("hi");
    expect(logger.doLog).toHaveBeenCalledTimes(8);
    done();
    logger.silence();
  });

  it("should properly throttle logging", done => {
    spyOn(logger, "deepDebug");
    spyOn(logger, "debug");
    spyOn(logger, "info");
    spyOn(logger, "highlight");
    spyOn(logger, "log");
    spyOn(logger, "error");
    spyOn(logger, "warn");
    for (let i = 0; i < 10; i++) {
      logger.deepDebugThrottle("a");
      logger.debugThrottle("a");
      logger.infoThrottle("a");
      logger.highlightThrottle("a");
      logger.logThrottle("a");
      logger.errorThrottle("a");
      logger.warnThrottle("a");
    }
    expect(logger.deepDebug).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.highlight).toHaveBeenCalledTimes(1);
    expect(logger.log).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    setTimeout(() => {
      expect(logger.deepDebug).toHaveBeenCalledTimes(2);
      expect(logger.debug).toHaveBeenCalledTimes(2);
      expect(logger.info).toHaveBeenCalledTimes(2);
      expect(logger.highlight).toHaveBeenCalledTimes(2);
      expect(logger.log).toHaveBeenCalledTimes(2);
      expect(logger.error).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalledTimes(2);
      done();
    }, 1500);
  });

  it("should assert all values properly", done => {
    expect(logger.assert({})).toBe(true);
    expect(logger.assert(1, true, [])).toBe(true);
    expect(logger.assert(5, 6, undefined)).toBe(false);
    expect(logger.assert(0, 1, 2, 3, 4)).toBe(false);
    expect(logger.assertOne(false, 0, "")).toBe(false);
    expect(logger.assertOne(false, 0, 1)).toBe(true);
    expect(logger.assertOnlyOne(true, true)).toBe(false);
    expect(logger.assertOnlyOne(true, false)).toBe(true);
    expect(logger.assertOnlyOne(false, false)).toBe(false);
    expect(logger.assertType([], "array")).toBe(true);
    expect(logger.assertType({}, "object")).toBe(true);
    expect(logger.assertType(12, "number")).toBe(true);
    expect(logger.assertType(true, "number")).toBe(false);
    expect(logger.assertType(false, "boolean")).toBe(true);
    expect(logger.assertGreaterThan(2, 1)).toBe(true);
    expect(logger.assertGreaterThan(1, 2)).toBe(false);
    expect(logger.assertLessThan(2, 1)).toBe(false);
    expect(logger.assertLessThan(1, 2)).toBe(true);
    expect(logger.assertLength([])).toBe(false);
    expect(logger.assertLength([1])).toBe(true);
    expect(logger.assertLength("asdf")).toBe(true);
    expect(logger.assertLength("")).toBe(false);
    expect(logger.assertEqual(2, 2)).toBe(true);
    expect(logger.assertEqual(2, 1)).toBe(false);
    expect(logger.assertNotEqual(2, 1)).toBe(true);
    expect(logger.assertNotEqual(2, 2)).toBe(false);
    done();
  });

  it("should instantiate a new logger properly", done => {
    logger.level = "warn";
    logger.talk();
    logger.warn({
      title: "Some Title",
      message: "Some Message",
      data: {},
      color: "green",
      indent: 1,
      suffix: true,
      marginTop: 1,
      marginBottom: 1,
      paddingBottom: 1,
      paddingTop: 1,
      borderTop: 1,
      borderBottom: 1,
      borderChar: "-",
      ts: true,
      timestamp: true,
      muted: false
    });
    expect(warn.calls.mostRecent().args[0]).toMatch(/^$/);
    logger.warn({
      type: "type 1",
      suffix: "asdf",
      message: new Error("hi"),
      muted: true
    });
    expect(warn.calls.mostRecent().args[0]).toMatch(/.*Error.*/);
    logger.warn({
      message: () => "hi"
    });
    expect(warn.calls.mostRecent().args[0]).toMatch(/hi/);
    logger.warn({
      message: { hi: true }
    });
    expect(warn.calls.mostRecent().args[0]).toMatch(/{"hi":true}/);
    done();
  });

  it("should process exec commands seamlessly", () => {
    const defLogger = Logger.logger;
    spyOn(defLogger, "error");
    spyOn(defLogger, "debug");
    logger.fromExec(true, true, true);
    expect(defLogger.debug).toHaveBeenCalledTimes(1);
    expect(defLogger.error).toHaveBeenCalledTimes(2);
  });

  it('should start a new logging group', () => {
    logger.level = 'debug';
    spyOn(logger, "doLog");
    logger.groupStart('Something');
    logger.debug("Hello World");
    logger.groupEnd();
    expect(group).toHaveBeenCalledWith('Something');
  })
});

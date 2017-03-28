const Logger = require('./Logger');
const exec = require('child_process').exec;
let logger;

describe('Logger', () => {

  beforeEach(() => logger = Logger.getLogger('debug', true));

  it('should display if it is debugging', done => {
    expect(logger.isDebugging).toBe(true);
    logger.level = 'info';
    expect(logger.isDebugging).toBe(false);
    done();
  });

  it('should have the default levels correct', done => {
    [
      'error',
      'warn',
      'highlight',
      'info',
      'log',
      'debug',
      'deepDebug'
    ].forEach((level, i) => {
      logger.level = level;
      expect(logger.level).toBe(i);
    });
    done();
  });

  it('should throw a fatal error', done => {
    expect(() => { logger.fatal('hi'); }).toThrow();
    done();
  });

  it('should silence and talk correctly', done => {
    spyOn(Logger, 'doLog');
    logger.log('hi');
    expect(Logger.doLog).toHaveBeenCalledTimes(0);
    logger.talk();
    logger.log('hi');
    expect(Logger.doLog).toHaveBeenCalled();
    done();
  });

  it('should log properly', () => {
    expect(Logger.getLogger() instanceof Logger).toBe(true);
    expect(Logger.logger instanceof Logger).toBe(true);
    expect(logger._getLastLine()).toContain('LoggerTest');
    expect(logger.LEVELS).toEqual(jasmine.arrayContaining(['info']));
    expect(logger.debug).toBeDefined();
    expect(logger.deepDebug).toBeDefined();
    expect(logger.highlight).toBeDefined();
    expect(logger.assert).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.error).toBeDefined();
    expect(logger.log).toBeDefined();
  });

  it('should return the same arguments passed to the methods', () => {
    expect(logger.debug('asdf')[0]).toBe('asdf');
    expect(logger.deepDebug('asdf')[0]).toBe('asdf');
    expect(logger.highlight('asdf')[0]).toBe('asdf');
    expect(logger.warn('asdf')[0]).toBe('asdf');
    expect(logger.error('asdf')[0]).toBe('asdf');
    expect(logger.log('asdf')[0]).toBe('asdf');
  });

  it('should log proper information from an exec command', done => {
    spyOn(logger, 'fromExec');
    exec('ls', logger.fromExec);
    exec('ls', () => {
      expect(logger.fromExec)
        .toHaveBeenCalledWith(null, jasmine.anything(), '');
      done();
    });
  });

  it('should properly log information', done => {
    logger.talk();
    spyOn(Logger, 'doLog');
    logger.level = 'error';
    logger.deepDebug('hi');
    logger.debug('hi');
    logger.info('hi');
    logger.highlight('hi');
    logger.log('hi');
    logger.error('hi');
    logger.warn('hi');
    expect(Logger.doLog).toHaveBeenCalledTimes(1);
    logger.level = 'debug';
    logger.deepDebug('hi');
    logger.debug('hi');
    logger.info('hi');
    logger.highlight('hi');
    logger.log('hi');
    logger.error('hi');
    logger.warn('hi');
    expect(Logger.doLog).toHaveBeenCalledTimes(7);
    done();
    logger.silence();
  });

  it('should properly throttle logging', done => {
    spyOn(logger, 'deepDebug');
    spyOn(logger, 'debug');
    spyOn(logger, 'info');
    spyOn(logger, 'highlight');
    spyOn(logger, 'log');
    spyOn(logger, 'error');
    spyOn(logger, 'warn');
    for(let i = 0; i < 10; i++){
      logger.deepDebugThrottle('a');
      logger.debugThrottle('a');
      logger.infoThrottle('a');
      logger.highlightThrottle('a');
      logger.logThrottle('a');
      logger.errorThrottle('a');
      logger.warnThrottle('a');
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

  it('should assert all values properly', done => {
    expect(logger.assert({})).toBe(true);
    expect(logger.assert(1, true, [])).toBe(true);
    expect(logger.assert(5, 6, undefined)).toBe(false);
    expect(logger.assert(0, 1, 2, 3, 4)).toBe(false);
    expect(logger.assertType([], 'array')).toBe(true);
    expect(logger.assertType({}, 'object')).toBe(true);
    expect(logger.assertType(12, 'number')).toBe(true);
    expect(logger.assertType(false, 'boolean')).toBe(true);
    expect(logger.assertGreaterThan(2, 1)).toBe(true);
    expect(logger.assertGreaterThan(1, 2)).toBe(false);
    expect(logger.assertLessThan(2, 1)).toBe(false);
    expect(logger.assertLessThan(1, 2)).toBe(true);
    expect(logger.assertLength([])).toBe(false);
    expect(logger.assertLength([1])).toBe(true);
    expect(logger.assertLength('asdf')).toBe(true);
    expect(logger.assertLength('')).toBe(false);
    expect(logger.assertEqual(2,2)).toBe(true);
    expect(logger.assertEqual(2,1)).toBe(false);
    expect(logger.assertNotEqual(2,1)).toBe(true);
    expect(logger.assertNotEqual(2,2)).toBe(false);
    done();
  });

});
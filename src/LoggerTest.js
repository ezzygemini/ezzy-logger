const logger = require('./Logger').logger;
const exec = require('child_process').exec;

describe('Logger', () => {

  beforeEach(() => logger.silence());
  afterEach(() => logger.talk());

  it('should log properly', () => {
    expect(logger.debug).toBeDefined();
    expect(logger.highlight).toBeDefined();
    expect(logger.assert).toBeDefined();
    expect(logger.warn).toBeDefined();
    expect(logger.error).toBeDefined();
    expect(logger.log).toBeDefined();
  });

  it('should return the same arguments passed to the methods', () => {
    expect(logger.debug('asdf')[0]).toBe('asdf');
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

  it('should assert all values properly', done => {
    expect(logger.assert({})).toBe(true);
    expect(logger.assert(1, true, [])).toBe(true);
    expect(logger.assert(5, 6, undefined)).toBe(false);
    expect(logger.assert(0, 1, 2, 3, 4)).toBe(false);
    done();
  });

});
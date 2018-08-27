const Logger = require("./src/Logger");

/**
 * Default instance of the logger.
 * @type {Logger}
 */
const logger = Logger.logger;

module.exports = {
  /**
   * @type {Logger}
   */
  logger,
  /**
   * @type {Logger}
   */
  Logger,
  /**
   * @type {Logger}
   */
  console: logger,
  /**
   * @type {Logger}
   */
  log: logger
};

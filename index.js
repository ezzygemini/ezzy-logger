const Logger = require("./src/Logger");

/**
 * Default instance of the logger.
 * @type {Logger}
 */
const logger = Logger.logger;

module.exports = {
  logger,
  Logger,
  console: logger,
  log: logger
};

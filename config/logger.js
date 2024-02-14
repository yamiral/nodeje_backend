const { createLogger, format, transports } = require("winston");

module.exports = createLogger({
  format: format.combine(
    format.simple(),
    format.timestamp(),
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.prettyPrint(),
    format.printf((info) => `[${info.timestamp}] ${info.level} => ${info.message}`)
  ),
  transports: [
    // new transports.File({
    //   maxsize: 5120000,
    //   maxFiles: 5,
    //   filename: "info.log",
    //   dirname: `${__dirname}/../logs/`,
    // }),
    new transports.Console(),
  ],
});
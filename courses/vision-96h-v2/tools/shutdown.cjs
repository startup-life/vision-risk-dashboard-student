'use strict';
// Shutdown for the local server. A second signal exits without waiting for open connections to close.
const SIGNALS = ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK'];

function installShutdown(app, options = {}) {
  const target = options.process || process;
  const exit = options.exit || (code => target.exit(code));
  const log = options.log || console;
  let closing = false;
  async function shutdown() {
    if (closing) return exit(1);
    closing = true;
    try {
      await app.close();
      return exit(0);
    } catch (e) {
      log.error(e && e.message || e);
      return exit(1);
    }
  }
  for (const signal of SIGNALS) target.on(signal, () => shutdown(signal));
  return shutdown;
}

module.exports = { SIGNALS, installShutdown };

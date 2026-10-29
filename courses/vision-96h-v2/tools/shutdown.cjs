'use strict';
// Shutdown for the local server. Windows ends the process about 10 seconds after the console
// window closes, while a running job can keep app.close() waiting longer than that.
// The job lock must not outlive the process, so it is released synchronously whenever waiting is cut short.
const CLOSE_TIMEOUT_MS = 5000;
const SIGNALS = ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK'];

function installShutdown(app, options = {}) {
  const target = options.process || process;
  const exit = options.exit || (code => target.exit(code));
  const log = options.log || console;
  const timeoutMs = options.timeoutMs ?? CLOSE_TIMEOUT_MS;
  const releaseLock = () => app.jobManager.releaseLock();
  let closing = false;
  async function shutdown(signal) {
    if (closing) {
      // A second signal means the user does not want to wait for running jobs.
      releaseLock();
      return exit(1);
    }
    closing = true;
    if (signal === 'SIGHUP') releaseLock();
    let timer;
    const timedOut = new Promise(resolve => { timer = setTimeout(resolve, timeoutMs, 'timeout'); });
    const closed = new Promise(resolve => resolve(app.close())).then(() => 'closed', e => { log.error(e && e.message || e); return 'failed'; });
    const result = await Promise.race([closed, timedOut]);
    clearTimeout(timer);
    if (result === 'closed') return exit(0);
    if (result === 'timeout') log.warn(`실행 중인 작업이 ${timeoutMs / 1000}초 안에 끝나지 않아 작업 잠금을 풀고 종료한다.`);
    releaseLock();
    return exit(1);
  }
  for (const signal of SIGNALS) target.on(signal, () => shutdown(signal));
  return shutdown;
}

module.exports = { CLOSE_TIMEOUT_MS, SIGNALS, installShutdown };

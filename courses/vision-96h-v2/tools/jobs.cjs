'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

class JobConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'JobConflictError';
    this.status = 409;
  }
}

class JobStoreUnhealthyError extends Error {
  constructor(message) {
    super(message);
    this.name = 'JobStoreUnhealthyError';
    this.status = 503;
  }
}

/**
 * 작업 파일 한 건을 저장하지 못한 경우. 저장소 전체는 정상으로 두고 그 작업만 실패시킨다.
 * JobStoreUnhealthyError를 상속해 서버가 같은 503 응답으로 처리한다.
 */
class JobPersistError extends JobStoreUnhealthyError {
  constructor(message, cause) {
    super(message);
    this.name = 'JobPersistError';
    this.code = 'JOB_PERSIST_FAILED';
    this.cause = cause;
  }
}

// Windows에서 백신·검색 색인·OneDrive가 파일을 잠깐 잡으면 rename이 이 코드로 실패한다. 짧게 다시 시도한다.
const RETRYABLE_RENAME_CODES = new Set(['EPERM', 'EBUSY', 'EACCES']);
const RENAME_RETRY_DELAYS_MS = [10, 25, 50, 100, 200];
// 소유권 lock 판단 규칙: 실행 중인 서버는 LOCK_HEARTBEAT_INTERVAL_MS마다 heartbeat_at을 갱신한다.
// PID가 살아 있어도 heartbeat_at이 LOCK_STALE_AFTER_MS 넘게 멈춰 있으면(창을 닫은 뒤 PID가 재사용된 경우) 오래된 lock으로 보고 넘겨받는다.
const LOCK_HEARTBEAT_INTERVAL_MS = 30 * 1000;
const LOCK_STALE_AFTER_MS = 2 * 60 * 1000;

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function renameWithRetry(from, to) {
  for (let attempt = 0; ; attempt++) {
    try {
      fs.renameSync(from, to);
      return;
    } catch (err) {
      if (!RETRYABLE_RENAME_CODES.has(err.code) || attempt >= RENAME_RETRY_DELAYS_MS.length) throw err;
      sleepSync(RENAME_RETRY_DELAYS_MS[attempt]);
    }
  }
}

/**
 * lock이 마지막으로 갱신된 뒤 지난 시간. heartbeat_at이 없는 이전 형식 lock은 acquired_at을 쓴다.
 */
function lockAgeMs(lockData, now = Date.now()) {
  const at = Date.parse(lockData.heartbeat_at || lockData.acquired_at || '');
  return Number.isFinite(at) ? now - at : Infinity;
}

function isLockStale(lockData, now = Date.now()) {
  const age = lockAgeMs(lockData, now);
  // 시계가 크게 앞선 값도 살아 있는 서버가 쓴 값일 수 없으므로 오래된 것으로 본다.
  return age > LOCK_STALE_AFTER_MS || age < -LOCK_STALE_AFTER_MS;
}

/**
 * 정규화된 입력 캐노니컬 핑거프린트 계산 (SHA-256)
 * - 사진 순서(프레임 1~5)는 의미 있는 입력이므로 sort하지 않고 순서 유지
 * - drive_file_ids 및 image_ids 모두 포괄
 */
function computeInputFingerprint(jobType, recordId, snapshot = {}) {
  const imageIds = Array.isArray(snapshot.drive_file_ids) && snapshot.drive_file_ids.length > 0
    ? snapshot.drive_file_ids
    : (Array.isArray(snapshot.image_ids) ? snapshot.image_ids : []);

  const normalized = {
    job_type: String(jobType || ''),
    record_id: String(recordId || ''),
    input_version: Number(snapshot.input_version || snapshot.version) || 1,
    standard_id: String(snapshot.standard_id || '').trim(),
    query: String(snapshot.query || '').trim(),
    category: String(snapshot.category || '').trim(),
    location: String(snapshot.location || '').trim(),
    memo: String(snapshot.memo || '').trim(),
    image_ids: imageIds.map(id => String(id)) // 순서 보존!
  };
  const json = JSON.stringify(normalized, Object.keys(normalized).sort());
  return crypto.createHash('sha256').update(json).digest('hex');
}

/**
 * 재귀적 민감정보 Redaction (API 키, 토큰, authorization 등)
 */
function deepRedact(obj, seen = new WeakSet()) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    // 1. Bearer 토큰 마스킹
    let s = obj.replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, 'Bearer [REDACTED]');
    // 2. Google AIza API 키 패턴
    s = s.replace(/AIza[0-9A-Za-z\-_]{35}/g, '[REDACTED_API_KEY]');
    // 2-1. OnePort 등 sk- 로 시작하는 API 키 패턴
    s = s.replace(/\bsk-[A-Za-z0-9_-]{20,200}/g, '[REDACTED_API_KEY]');
    // 3. URL 쿼리 파라미터 key/token/secret 마스킹
    s = s.replace(/([?&](?:key|api_key|token|secret|password)=)[^&\s]+/gi, '$1[REDACTED]');
    // 4. 일반 key=value / token=value 마스킹
    s = s.replace(/((?:key|token|secret|password)\s*[:=]\s*["']?)[A-Za-z0-9\-._~+/]+(["']?)/gi, '$1[REDACTED]$2');
    return s;
  }
  if (typeof obj !== 'object') return obj;
  if (seen.has(obj)) return '[Circular]';
  seen.add(obj);

  if (Array.isArray(obj)) {
    return obj.map(item => deepRedact(item, seen));
  }

  const redacted = {};
  const sensitiveKeyRegex = /secret|token|apikey|api_key|auth|password|private_key/i;

  for (const [k, v] of Object.entries(obj)) {
    if (sensitiveKeyRegex.test(k)) {
      redacted[k] = '[REDACTED]';
    } else {
      redacted[k] = deepRedact(v, seen);
    }
  }
  return redacted;
}

class JobManager {
  /**
   * @param {Object} options
   * @param {string} [options.jobsDir] - 작업 파일 저장 디렉터리
   * @param {Function} [options.reconcileFn] - 재시작 복구 시 외부/스토어 결과 조회 함수: async (job) => result | null
   */
  constructor(options = {}) {
    this.jobsDir = options.jobsDir || path.resolve(__dirname, '../preview/_jobs');
    this.reconcileFn = options.reconcileFn || null;
    this.jobs = new Map(); // jobId -> job
    this.queue = []; // Array of jobIds
    this.currentRunningJobId = null;
    this.isProcessing = false;
    this.executors = new Map(); // jobId -> executor async fn
    this.unhealthy = false;
    this.unhealthyReason = null;
    this.closed = false;
    this.instanceId = `mgr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    this.lockFilePath = path.join(this.jobsDir, '.owner.lock');
    this.lockHeartbeatTimer = null;

    this.ensureJobsDir();
  }

  ensureJobsDir() {
    if (!fs.existsSync(this.jobsDir)) {
      fs.mkdirSync(this.jobsDir, { recursive: true });
    }
  }

  markUnhealthy(reason) {
    this.unhealthy = true;
    this.unhealthyReason = reason;
    this.queue = []; // 추가 큐 중단
    console.error(`[JobManager] STORE UNHEALTHY: ${reason}`);
  }

  checkHealthy() {
    if (this.unhealthy) {
      throw new JobStoreUnhealthyError(`Job store is unhealthy: ${this.unhealthyReason}`);
    }
    if (this.closed) {
      throw new Error('JobManager is closed');
    }
  }

  /**
   * 소유권 락 획득 (원자적 wx 플래그, 단일 프로세스 소유 보장)
   */
  acquireLock() {
    this.ensureJobsDir();

    const writeLockExclusive = () => {
      const now = new Date().toISOString();
      const lockPayload = JSON.stringify({
        pid: process.pid,
        instanceId: this.instanceId,
        acquired_at: now,
        heartbeat_at: now
      }, null, 2);
      fs.writeFileSync(this.lockFilePath, lockPayload, { flag: 'wx', encoding: 'utf8', mode: 0o600 });
      this.startLockHeartbeat();
    };

    try {
      writeLockExclusive();
      return true;
    } catch (err) {
      if (err.code !== 'EEXIST') {
        this.markUnhealthy(`Failed to create owner lock file: ${err.message}`);
        return false;
      }
    }

    // 파일이 이미 존재하는 경우 검증
    try {
      const content = fs.readFileSync(this.lockFilePath, 'utf8');
      const lockData = JSON.parse(content);

      if (!lockData || !lockData.pid || !lockData.instanceId) {
        this.markUnhealthy('Corrupted or invalid owner lock schema');
        return false;
      }

      // 동일 인스턴스인 경우 재진입 허용
      if (lockData.instanceId === this.instanceId) {
        return true;
      }

      // 프로세스 생존 검사
      let processDead = false;
      let aliveReason = null;
      try {
        process.kill(lockData.pid, 0);
        aliveReason = `Another process (PID ${lockData.pid}, instance ${lockData.instanceId}) holds the job store lock`;
      } catch (killErr) {
        if (killErr.code === 'ESRCH') {
          // 프로세스 확실히 사망
          processDead = true;
        } else {
          // EPERM 등 권한 에러는 프로세스가 살아있음을 의미
          aliveReason = `Process PID ${lockData.pid} is active or uninspectable (${killErr.code})`;
        }
      }

      // PID가 살아 있어도 갱신이 멈춘 lock은 PID 재사용으로 보고 넘겨받는다. 갱신 중이면 fail-close.
      if (!processDead && !isLockStale(lockData)) {
        this.markUnhealthy(aliveReason);
        return false;
      }

      // stale lock 회수. 두 프로세스가 동시에 넘겨받지 않도록 옆으로 옮긴 파일이 판단한 그 lock인지 확인하고,
      // wx로 새로 쓴 뒤 다시 읽어 내 instanceId인지 확인한다.
      const aside = `${this.lockFilePath}.stale.${this.instanceId}`;
      try {
        fs.renameSync(this.lockFilePath, aside);
      } catch (renameErr) {
        this.markUnhealthy(renameErr.code === 'ENOENT'
          ? 'Another process is taking over the stale job store lock'
          : `Failed to reclaim stale lock: ${renameErr.message}`);
        return false;
      }
      let movedContent = null;
      try { movedContent = fs.readFileSync(aside, 'utf8'); } catch (_) { movedContent = null; }
      if (movedContent !== content) {
        // 그사이 다른 프로세스가 새 lock을 만들었다. 덮어쓰지 않게 link로 되돌리고 물러난다.
        try { fs.linkSync(aside, this.lockFilePath); } catch (_) {}
        try { fs.unlinkSync(aside); } catch (_) {}
        this.markUnhealthy('Another process took over the stale job store lock first');
        return false;
      }
      try {
        fs.unlinkSync(aside);
        writeLockExclusive();
        const written = JSON.parse(fs.readFileSync(this.lockFilePath, 'utf8'));
        if (!written || written.instanceId !== this.instanceId) {
          this.stopLockHeartbeat();
          this.markUnhealthy('Another process took over the stale job store lock at the same time');
          return false;
        }
        return true;
      } catch (reclaimErr) {
        this.stopLockHeartbeat();
        this.markUnhealthy(`Failed to reclaim stale lock: ${reclaimErr.message}`);
        return false;
      }
    } catch (readErr) {
      this.markUnhealthy(`Failed to inspect existing owner lock: ${readErr.message}`);
      return false;
    }

    return false;
  }

  startLockHeartbeat() {
    this.stopLockHeartbeat();
    this.lockHeartbeatTimer = setInterval(() => this.refreshLock(), LOCK_HEARTBEAT_INTERVAL_MS);
    if (typeof this.lockHeartbeatTimer.unref === 'function') this.lockHeartbeatTimer.unref();
  }

  stopLockHeartbeat() {
    if (this.lockHeartbeatTimer) {
      clearInterval(this.lockHeartbeatTimer);
      this.lockHeartbeatTimer = null;
    }
  }

  /**
   * lock의 heartbeat_at 갱신. 다른 프로세스가 lock을 가져갔으면 저장소를 unhealthy로 둔다(fail-close).
   * 쓰기 실패는 다음 주기에 다시 시도한다.
   */
  refreshLock() {
    if (this.closed || this.unhealthy) return false;
    let lockData = null;
    try {
      lockData = JSON.parse(fs.readFileSync(this.lockFilePath, 'utf8'));
    } catch (err) {
      // lock 파일이 없어진 경우만 넘겨받은 것으로 본다. 그 밖의 읽기·파싱 오류(EBUSY·EPERM·EACCES,
      // 다른 프로세스가 쓰는 중인 내용 등)는 일시적일 수 있어 다음 주기에 다시 시도한다.
      if (err.code !== 'ENOENT') {
        console.error(`[JobManager] Could not read owner lock, retrying next heartbeat: ${err.message}`);
        return false;
      }
      lockData = null;
    }
    if (!lockData || lockData.instanceId !== this.instanceId) {
      this.stopLockHeartbeat();
      this.markUnhealthy('Job store owner lock was removed or taken over by another process');
      return false;
    }
    const tmpPath = `${this.lockFilePath}.tmp.${process.pid}_${crypto.randomBytes(4).toString('hex')}`;
    try {
      fs.writeFileSync(tmpPath, JSON.stringify({ ...lockData, heartbeat_at: new Date().toISOString() }, null, 2), { encoding: 'utf8', mode: 0o600 });
      renameWithRetry(tmpPath, this.lockFilePath);
      return true;
    } catch (err) {
      try { fs.unlinkSync(tmpPath); } catch (_) {}
      console.error(`[JobManager] Failed to refresh owner lock: ${err.message}`);
      return false;
    }
  }

  releaseLock() {
    this.stopLockHeartbeat();
    try {
      if (fs.existsSync(this.lockFilePath)) {
        const content = fs.readFileSync(this.lockFilePath, 'utf8');
        const lockData = JSON.parse(content);
        if (lockData.instanceId === this.instanceId) {
          fs.unlinkSync(this.lockFilePath);
        }
      }
    } catch (_) {}
  }

  /**
   * 원자적 파일 쓰기 (0600 권한, tmp -> rename, deep redact)
   */
  writeJobFileAtomic(job) {
    this.checkHealthy();
    this.ensureJobsDir();
    const filePath = path.join(this.jobsDir, `${job.job_id}.json`);
    const tmpPath = path.join(this.jobsDir, `${job.job_id}.json.tmp.${Date.now()}_${crypto.randomBytes(4).toString('hex')}`);

    try {
      const safeJob = deepRedact(job);
      const content = JSON.stringify(safeJob, null, 2);

      fs.writeFileSync(tmpPath, content, { encoding: 'utf8', mode: 0o600 });
      try {
        fs.chmodSync(tmpPath, 0o600);
      } catch (_) {}
    } catch (err) {
      this.markUnhealthy(`Atomic file write failed for job ${job.job_id}: ${err.message}`);
      throw err;
    }

    try {
      renameWithRetry(tmpPath, filePath);
    } catch (err) {
      try { fs.unlinkSync(tmpPath); } catch (_) {}
      // 재시도해도 rename이 안 되면 저장소 전체가 아니라 이 작업 저장만 실패로 본다.
      throw new JobPersistError(`Failed to save job ${job.job_id} (${err.code || 'rename failed'}): ${err.message}`, err);
    }
  }

  /**
   * 서버 시작/초기화 시 디스크 작업 복구
   */
  async init() {
    this.ensureJobsDir();
    if (!this.acquireLock()) {
      return;
    }

    const files = fs.readdirSync(this.jobsDir);
    const loadedJobs = [];
    const seenRequestIds = new Map(); // reqId -> jobId

    for (const file of files) {
      if (!file.endsWith('.json') || file.includes('.tmp.') || file === '.owner.lock') continue;
      const fullPath = path.join(this.jobsDir, file);
      const expectedJobId = file.slice(0, -5);

      let parsed;
      try {
        const text = fs.readFileSync(fullPath, 'utf8');
        parsed = JSON.parse(text);
      } catch (err) {
        // fail-closed: 손상된 파일 발견 시 스토어 unhealthy 마킹 (원본 보존)
        this.markUnhealthy(`Corrupted JSON in job file ${file}: ${err.message}`);
        return;
      }

      // 스키마 및 파일명-ID 일치 검증
      if (!parsed || typeof parsed !== 'object' || parsed.job_id !== expectedJobId || !parsed.request_id || !parsed.record_id || !parsed.job_type) {
        this.markUnhealthy(`Invalid job schema or ID mismatch in file ${file}`);
        return;
      }

      // 동일 request_id 충돌 검증
      if (seenRequestIds.has(parsed.request_id)) {
        const conflictJobId = seenRequestIds.get(parsed.request_id);
        this.markUnhealthy(`Duplicate request_id '${parsed.request_id}' found in jobs ${conflictJobId} and ${parsed.job_id}`);
        return;
      }
      seenRequestIds.set(parsed.request_id, parsed.job_id);

      loadedJobs.push(parsed);
    }

    // 시간 순 정렬
    loadedJobs.sort((a, b) => (new Date(a.created_at).getTime() || 0) - (new Date(b.created_at).getTime() || 0));

    for (const job of loadedJobs) {
      this.jobs.set(job.job_id, job);

      // 복구 로직: running 상태였던 작업
      if (job.status === 'running') {
        let reconciled = null;
        if (typeof this.reconcileFn === 'function') {
          try {
            reconciled = await this.reconcileFn(job);
          } catch (e) {
            reconciled = null;
          }
        }

        if (reconciled) {
          job.status = 'succeeded';
          job.completed_at = job.completed_at || new Date().toISOString();
          job.result = reconciled;
          try {
            this.writeJobFileAtomic(job);
          } catch (err) {
            if (!(err instanceof JobPersistError)) return;
            console.error(`[JobManager] ${err.message}`);
          }
        } else {
          // 확인 불가한 경우 자동 재실행하지 않고 interrupted 마킹 (외부 API 무단 재호출 차단)
          job.status = 'interrupted';
          job.completed_at = new Date().toISOString();
          job.error = {
            code: 'SERVER_RESTARTED',
            message: '서버 재시작으로 작업이 중단되었습니다. 외부 호출 결과를 확인할 수 없어 자동 재실행하지 않습니다.',
            interrupted: true
          };
          try {
            this.writeJobFileAtomic(job);
          } catch (err) {
            if (!(err instanceof JobPersistError)) return;
            console.error(`[JobManager] ${err.message}`);
          }
        }
      } else if (job.status === 'queued') {
        // 프로세스 재시작 시 executor가 없는 queued 작업은 interrupted 처리
        job.status = 'interrupted';
        job.completed_at = new Date().toISOString();
        job.error = {
          code: 'SERVER_RESTARTED',
          message: '서버 재시작으로 대기열이 중단되었습니다. 자동 재실행하지 않습니다.',
          interrupted: true
        };
        try {
          this.writeJobFileAtomic(job);
        } catch (err) {
          if (!(err instanceof JobPersistError)) return;
          console.error(`[JobManager] ${err.message}`);
        }
      }
    }
  }

  /**
   * 새 작업 생성 및 큐 등록
   */
  createJob(params) {
    this.checkHealthy();

    const { job_type, record_id, request_id, input_version = 1, input_snapshot = {}, executor } = params;

    if (!job_type || !record_id || !request_id) {
      throw new Error('job_type, record_id, and request_id are required');
    }

    const currentFingerprint = computeInputFingerprint(job_type, record_id, {
      ...input_snapshot,
      input_version
    });

    // 1. 동일 request_id 검사 (가장 우선)
    for (const existing of this.jobs.values()) {
      if (existing.request_id === request_id) {
        if (existing.fingerprint === currentFingerprint) {
          // 동일 request_id + 동일 입력 -> 멱등 반환
          return { job: existing, isExisting: true };
        } else {
          // 동일 request_id인데 입력(버전, 사진, 메모, 쿼리 등)이 다름 -> 409 Conflict
          throw new JobConflictError(`request_id '${request_id}' has already been used with different input parameters.`);
        }
      }
    }

    // 2. 활성 작업(queued/running) 중복 검사
    for (const existing of this.jobs.values()) {
      if (existing.record_id === record_id && existing.job_type === job_type) {
        if (existing.status === 'queued' || existing.status === 'running') {
          if (existing.fingerprint === currentFingerprint) {
            // 완전히 동일한 입력의 활성 작업이 이미 있으면 병합 반환
            return { job: existing, isExisting: true };
          } else {
            // 다른 입력으로 동일 사건에 활성 작업이 이미 진행 중이면 충돌(409) 거절
            throw new JobConflictError(`An active ${job_type} job is already in progress for record '${record_id}' with different input parameters.`);
          }
        }
      }
    }

    // 3. 신규 Job 생성
    const jobId = `job_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date().toISOString();

    const job = {
      job_id: jobId,
      job_type,
      record_id,
      request_id,
      fingerprint: currentFingerprint,
      status: 'queued',
      created_at: now,
      started_at: null,
      completed_at: null,
      acknowledged: false,
      acknowledged_at: null,
      input_version: Number(input_version) || 1,
      input_snapshot: deepRedact({
        ...input_snapshot,
        input_version: Number(input_version) || 1
      }) || {},
      provider_result: null, // MCP/Gemini raw provider response (no secrets)
      result: null,
      error: null
    };

    // 디스크 저장 성공 후에만 메모리 인덱스 및 executor 등록!
    this.writeJobFileAtomic(job);

    this.jobs.set(jobId, job);
    if (typeof executor === 'function') {
      this.executors.set(jobId, executor);
    }

    this.queue.push(jobId);
    this.processQueue();

    return { job, isExisting: false };
  }

  /**
   * 직렬화 Worker (외부 Provider 동시 호출 1개 제한)
   */
  async processQueue() {
    if (this.unhealthy || this.closed) return;
    if (this.isProcessing) return;
    if (this.queue.length === 0) return;

    this.isProcessing = true;
    const jobId = this.queue.shift();
    const job = this.jobs.get(jobId);

    if (!job || job.status !== 'queued') {
      this.isProcessing = false;
      return this.processQueue();
    }

    this.currentRunningJobId = jobId;
    job.status = 'running';
    job.started_at = new Date().toISOString();

    try {
      this.writeJobFileAtomic(job);
    } catch (err) {
      this.currentRunningJobId = null;
      this.isProcessing = false;
      if (!(err instanceof JobPersistError)) return;
      // running 상태를 남기지 못했으면 외부 호출을 하지 않고 이 작업만 실패로 끝낸다.
      this.executors.delete(jobId);
      job.status = 'failed';
      job.completed_at = new Date().toISOString();
      job.error = { code: err.code, message: err.message, interrupted: false };
      try {
        this.writeJobFileAtomic(job);
      } catch (_) {}
      setImmediate(() => this.processQueue());
      return;
    }

    const executor = this.executors.get(jobId);
    this.executors.delete(jobId);

    this.currentRunningPromise = (async () => {
      try {
        if (typeof executor !== 'function') {
          throw new Error('Executor function not found for job');
        }

        // 외부 Provider 호출 실행
        const execResult = await executor(job);

        if (this.closed) return; // 닫힌 후에는 디스크 쓰기 엄격 차단

        job.status = 'succeeded';
        job.completed_at = new Date().toISOString();
        if (execResult && execResult.provider_result) {
          job.provider_result = deepRedact(execResult.provider_result);
          delete execResult.provider_result;
        }
        job.result = deepRedact(execResult);
        job.error = null;
        try {
          this.writeJobFileAtomic(job);
        } catch (persistErr) {
          if (!(persistErr instanceof JobPersistError)) throw persistErr;
          // 외부 호출은 이미 끝났으므로 메모리의 성공 결과를 유지한다. 디스크에는 running이 남아 재시작 때 reconcile로 맞춘다.
          job.persist_error = { code: persistErr.code, message: persistErr.message };
          console.error(`[JobManager] ${persistErr.message}`);
        }
      } catch (err) {
        if (this.closed) return; // 닫힌 후에는 디스크 쓰기 엄격 차단

        job.completed_at = new Date().toISOString();
        const isInterrupted = err.interrupted === true || err.code === 'NETWORK_TIMEOUT' || err.code === 'ECONNRESET';
        job.status = isInterrupted ? 'interrupted' : 'failed';
        job.error = {
          code: err.code || (isInterrupted ? 'INTERRUPTED' : 'INTERNAL_ERROR'),
          message: String(err.message || err),
          interrupted: isInterrupted
        };
        try {
          this.writeJobFileAtomic(job);
        } catch (_) {}
      } finally {
        this.currentRunningJobId = null;
        this.currentRunningPromise = null;
        this.isProcessing = false;
        if (!this.unhealthy && !this.closed) {
          setImmediate(() => this.processQueue());
        }
      }
    })();

    await this.currentRunningPromise;
  }

  /**
   * 단일 작업 조회
   */
  getJob(jobId) {
    this.checkHealthy();
    if (!jobId) return null;
    return this.jobs.get(jobId) || null;
  }

  /**
   * 작업 목록 조회
   */
  listJobs(filter = {}) {
    this.checkHealthy();
    const list = Array.from(this.jobs.values());
    return list.filter(j => {
      if (filter.record_id && j.record_id !== filter.record_id) return false;
      if (filter.job_type && j.job_type !== filter.job_type) return false;
      if (filter.status && j.status !== filter.status) return false;
      if (filter.acknowledged !== undefined && j.acknowledged !== filter.acknowledged) return false;
      return true;
    }).sort((a, b) => (new Date(b.created_at).getTime() || 0) - (new Date(a.created_at).getTime() || 0));
  }

  /**
   * MCP/외부 provider 결과 즉시 원자적 디스크 저장 (Sheets 저장 실패 시에도 로컬 보존)
   */
  persistProviderResult(jobId, providerResult) {
    this.checkHealthy();
    const job = this.jobs.get(jobId);
    if (!job) return null;

    job.provider_result = deepRedact(providerResult);
    this.writeJobFileAtomic(job);
    return job;
  }

  /**
   * 지속 알림 명시적 닫음/확인 (ACK)
   */
  ackJob(jobId) {
    this.checkHealthy();
    const job = this.jobs.get(jobId);
    if (!job) return null;

    job.acknowledged = true;
    job.acknowledged_at = new Date().toISOString();
    this.writeJobFileAtomic(job);
    return job;
  }

  /**
   * 정상 종료 (shutdown 경계: 실행 중인 worker 대기 또는 완료 후 lock 해제)
   */
  async close() {
    this.closed = true;
    this.stopLockHeartbeat();
    this.queue = []; // 추가 큐 배수 중단
    if (this.currentRunningPromise) {
      try {
        await this.currentRunningPromise;
      } catch (_) {}
    }
    this.releaseLock();
  }
}

module.exports = {
  JobManager,
  JobConflictError,
  JobStoreUnhealthyError,
  JobPersistError,
  LOCK_HEARTBEAT_INTERVAL_MS,
  LOCK_STALE_AFTER_MS,
  computeInputFingerprint,
  deepRedact
};

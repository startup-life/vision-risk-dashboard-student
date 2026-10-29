'use strict';

/**
 * ISO 8601 및 yyyy-MM-dd HH:mm:ss(KST) 문자열을 epoch ms로 변환
 */
function parseKstOrIso(ts) {
  if (!ts) return null;
  if (ts instanceof Date) {
    const time = ts.getTime();
    return isNaN(time) ? null : time;
  }
  const str = String(ts).trim();
  if (!str) return null;

  // 1. yyyy-MM-dd HH:mm:ss 또는 yyyy-MM-dd HH:mm:ss.SSS (KST GMT+09:00 명시 해석)
  const kstMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?$/);
  if (kstMatch) {
    const [, yStr, mStr, dStr, hStr, minStr, sStr, msStr] = kstMatch;
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    const d = parseInt(dStr, 10);
    const h = parseInt(hStr, 10);
    const min = parseInt(minStr, 10);
    const s = parseInt(sStr, 10);

    if (m < 1 || m > 12 || d < 1 || d > 31 || h > 23 || min > 59 || s > 59) return null;
    const checkDate = new Date(Date.UTC(y, m - 1, d));
    if (checkDate.getUTCFullYear() !== y || (checkDate.getUTCMonth() + 1) !== m || checkDate.getUTCDate() !== d) {
      return null; // 2월 30일 등 존재하지 않는 날짜
    }

    const isoStr = `${yStr}-${mStr}-${dStr}T${hStr}:${minStr}:${sStr}${msStr ? '.' + msStr.padEnd(3, '0').slice(0, 3) : ''}+09:00`;
    const t = Date.parse(isoStr);
    return isNaN(t) ? null : t;
  }

  // 2. ISO 8601 with Z or offset
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:?\d{2})?$/i);
  if (isoMatch) {
    const [, yStr, mStr, dStr, hStr, minStr, sStr] = isoMatch;
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    const d = parseInt(dStr, 10);
    const h = parseInt(hStr, 10);
    const min = parseInt(minStr, 10);
    const s = parseInt(sStr, 10);

    if (m < 1 || m > 12 || d < 1 || d > 31 || h > 23 || min > 59 || s > 59) return null;
    const checkDate = new Date(Date.UTC(y, m - 1, d));
    if (checkDate.getUTCFullYear() !== y || (checkDate.getUTCMonth() + 1) !== m || checkDate.getUTCDate() !== d) {
      return null;
    }

    const t = Date.parse(str);
    return isNaN(t) ? null : t;
  }

  return null;
}

/**
 * 불리언 정규화: true/false, 'true'/'false', 'TRUE'/'FALSE'만 boolean으로 인정, 나머지는 null
 */
function normalizeBool(val) {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    if (s === 'true') return true;
    if (s === 'false') return false;
  }
  return null;
}

/**
 * Google Sheets 셀 날짜 정규화:
 * - Date 객체: isNaN이면 null (Invalid Date는 불명 처리), 정상이면 ISO 8601 문자열(val.toISOString())로 정규화
 * - 문자열: 엄격 ISO/KST 형식만 허용 (parseKstOrIso 검증 통과한 경우에만 문자열 인정, 임의 자연어는 null 불명 처리)
 * - 기타/빈값: null
 */
function normalizeSheetDate(val) {
  if (val === undefined || val === null || val === '') return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return val.toISOString();
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return null;
    const ms = parseKstOrIso(trimmed);
    if (ms === null) return null;
    return trimmed;
  }
  return null;
}

/**
 * 단일 사건의 review_summary 및 queue 산출
 */
function buildReviewSummary(record, aiList = [], evidenceList = [], reviewList = [], actionList = []) {
  const latestAi = aiList.length > 0 ? aiList[aiList.length - 1] : null;
  const latestEvidence = evidenceList.length > 0 ? evidenceList[evidenceList.length - 1] : null;
  const latestReview = reviewList.length > 0 ? reviewList[reviewList.length - 1] : null;
  const latestAction = actionList.length > 0 ? actionList[actionList.length - 1] : null;

  const ai = latestAi ? {
    facts: latestAi.facts || '',
    suspected_risk: latestAi.suspected_risk || '',
    locations: latestAi.locations || '',
    uncertainty: latestAi.uncertainty || '',
    additional_checks: latestAi.additional_checks || '',
    input_version: latestAi.input_version !== undefined && latestAi.input_version !== '' && latestAi.input_version !== null ? Number(latestAi.input_version) : null,
    created_at: normalizeSheetDate(latestAi.created_at)
  } : null;

  const evidence = latestEvidence ? {
    standard_id: latestEvidence.standard_id || '',
    source_id: latestEvidence.source_id || '',
    quote: latestEvidence.quote || '',
    match: normalizeBool(latestEvidence.match),
    sufficient: normalizeBool(latestEvidence.sufficient),
    notes: latestEvidence.notes || '',
    input_version: latestEvidence.input_version !== undefined && latestEvidence.input_version !== '' && latestEvidence.input_version !== null ? Number(latestEvidence.input_version) : null,
    created_at: normalizeSheetDate(latestEvidence.created_at)
  } : null;

  const review = latestReview ? {
    decision: latestReview.decision || '',
    basis: latestReview.basis || '',
    followup_note: latestReview.followup_note || '',
    reviewer: latestReview.reviewer || '',
    created_at: normalizeSheetDate(latestReview.created_at)
  } : null;

  const action = latestAction ? {
    action_type: latestAction.action_type || '',
    description: latestAction.description || '',
    evidence_note: latestAction.evidence_note || '',
    created_at: normalizeSheetDate(latestAction.created_at)
  } : null;

  // 버전 및 수정 시점 판별
  const version = Number(record.version) || 1;
  const isUpdated = version > 1;
  const recordCreatedMs = parseKstOrIso(record.created_at);
  const updatedAtMs = record.updated_at ? parseKstOrIso(record.updated_at) : (isUpdated ? null : recordCreatedMs);

  // version > 1인데 갱신 시점을 판별할 수 없으면 timeUnknown
  const versionTimeUnknown = isUpdated && (updatedAtMs === null);

  function checkContextChanged(stepObj) {
    if (!stepObj) return false;
    if (stepObj.input_version !== undefined && stepObj.input_version !== null) {
      if (version > Number(stepObj.input_version)) return true;
      if (version <= Number(stepObj.input_version)) return false;
    }
    if (!isUpdated) return false;
    if (versionTimeUnknown) return true;
    const stepMs = parseKstOrIso(stepObj.created_at);
    if (stepMs === null) return true;
    return updatedAtMs > stepMs;
  }

  const contextChanged = {
    after_ai: checkContextChanged(ai),
    after_evidence: checkContextChanged(evidence),
    after_review: checkContextChanged(review),
    after_action: checkContextChanged(action),
    version_time_unknown: versionTimeUnknown
  };

  // completion_recorded_after_review 판정
  let completionRecordedAfterReview = false;
  if (review && review.decision === '위험 확인') {
    if (action && action.action_type === 'COMPLETE') {
      const hasEvidenceNote = typeof action.evidence_note === 'string' && action.evidence_note.trim().length > 0;
      if (!hasEvidenceNote) {
        completionRecordedAfterReview = false;
      } else {
        const actionMs = parseKstOrIso(action.created_at);
        const reviewMs = parseKstOrIso(review.created_at);

        if (actionMs === null || reviewMs === null || actionMs === reviewMs) {
          completionRecordedAfterReview = null; // 동률 또는 시간 관계 확인 불가: 선후관계 증거 없으므로 additional_check
        } else if (actionMs < reviewMs) {
          completionRecordedAfterReview = false; // 판정보다 오래된 COMPLETE
        } else if (contextChanged.after_action) {
          completionRecordedAfterReview = false; // 조치 완료 이후 정보 수정됨
        } else {
          completionRecordedAfterReview = true; // actionMs > reviewMs 이고 after_action 아님
        }
      }
    } else {
      completionRecordedAfterReview = false;
    }
  } else {
    completionRecordedAfterReview = null;
  }

  // 큐 및 사유 판정
  let queue = null;
  let queueReason = '';

  if (!review) {
    queue = 'awaiting_review';
    queueReason = '사람 검토 대기';
  } else {
    const dec = (review.decision || '').trim();
    const reviewMs = parseKstOrIso(review.created_at);
    const isUnknownDecision = !['위험 확인', '판단 보류', '기준 충족', '해당 없음'].includes(dec);

    if (versionTimeUnknown) {
      queue = 'additional_check';
      queueReason = '사건 수정 시각 불명으로 재확인 필요';
    } else if (reviewMs === null) {
      queue = 'additional_check';
      queueReason = '판정 일시 불명으로 재확인 필요';
    } else if (isUnknownDecision) {
      queue = 'additional_check';
      queueReason = `알 수 없는 판정 결과(${dec})`;
    } else if (dec === '판단 보류') {
      queue = 'additional_check';
      queueReason = '판단 보류 상태 (추가 자료 필요)';
    } else if (contextChanged.after_review) {
      queue = 'additional_check';
      queueReason = `판정 후 사건 정보 수정됨 (v${version})`;
    } else if (dec === '위험 확인') {
      if (completionRecordedAfterReview === true) {
        queue = null; // 완료됨
        queueReason = '위험 확인 후 현장 조치 완료';
      } else if (completionRecordedAfterReview === null) {
        queue = 'additional_check';
        queueReason = '조치 완료 근거 또는 완료 일시 재확인 필요';
      } else {
        queue = 'confirmed_risk';
        queueReason = '위험 확인 (현장 조치 필요)';
      }
    } else if (dec === '기준 충족' || dec === '해당 없음') {
      queue = null;
      queueReason = `${dec} 확인 완료`;
    } else {
      queue = 'additional_check';
      queueReason = '추가 확인 필요';
    }
  }

  return {
    ai,
    evidence,
    review,
    latest_action: action,
    context_changed: contextChanged,
    queue,
    queue_reason: queueReason,
    completion_recorded_after_review: completionRecordedAfterReview
  };
}

/**
 * 전체 레코드 목록에서 queue_counts 산출
 */
function computeQueueCounts(records) {
  let additional_check = 0;
  let awaiting_review = 0;
  let confirmed_risk = 0;

  for (const r of records) {
    const q = r.review_summary ? r.review_summary.queue : null;
    if (q === 'additional_check') additional_check++;
    else if (q === 'awaiting_review') awaiting_review++;
    else if (q === 'confirmed_risk') confirmed_risk++;
  }

  return {
    additional_check,
    awaiting_review,
    confirmed_risk
  };
}

module.exports = {
  parseKstOrIso,
  normalizeBool,
  normalizeSheetDate,
  buildReviewSummary,
  computeQueueCounts
};

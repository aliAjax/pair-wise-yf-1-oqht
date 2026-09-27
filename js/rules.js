/**
 * 观测规则 —— 单独维护。
 * 判定标准变化（如云量阈值、摘要准入条件）只改这个文件。
 */
window.OBS_RULES = (function () {
  /** 云量超过四成（>40%）转入待复核 */
  var CLOUD_REVIEW_THRESHOLD = 40;

  /**
   * 判断一条新登记是否需要转入待复核。
   * 返回原因数组，空数组表示可直接确认。
   */
  function reviewReasons(rec) {
    var reasons = [];
    if (Number(rec.cloudCover) > CLOUD_REVIEW_THRESHOLD) {
      reasons.push('云量 ' + rec.cloudCover + '% 超过四成');
    }
    if (rec.mountError) {
      reasons.push('赤道仪报错');
    }
    return reasons;
  }

  /**
   * 同一台设备的观测时段不能重叠。
   * 与既有记录（含待复核、已确认，排除已作废）比较，ignoreId 用于编辑时排除自身。
   * 返回冲突记录或 null。
   */
  function findOverlap(records, deviceId, startTime, endTime, ignoreId) {
    var s = new Date(startTime).getTime();
    var e = new Date(endTime).getTime();
    if (!(e > s)) return { invalid: true };
    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      if (r.deviceId !== deviceId || r.id === ignoreId || r.voided) continue;
      var rs = new Date(r.startTime).getTime();
      var re = new Date(r.endTime).getTime();
      if (s < re && rs < e) return r;
    }
    return null;
  }

  /** 复核前（pending）不进入当晚摘要；已作废也不进入。 */
  function inNightSummary(rec) {
    return rec.status === 'confirmed' && !rec.voided;
  }

  return {
    CLOUD_REVIEW_THRESHOLD: CLOUD_REVIEW_THRESHOLD,
    reviewReasons: reviewReasons,
    findOverlap: findOverlap,
    inNightSummary: inNightSummary,
  };
})();

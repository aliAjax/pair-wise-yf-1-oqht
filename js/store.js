/**
 * 记录存储：localStorage 持久化 + 版本留存。
 * 已确认记录被修改时，旧版本与修改原因进入 versions，永不覆盖。
 */
window.OBS_STORE = (function () {
  var KEY = 'obs-handover-records-v1';

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch (e) { return []; }
  }
  function save(records) {
    localStorage.setItem(KEY, JSON.stringify(records));
  }

  function all() { return load(); }
  function byId(id) {
    var rs = load();
    for (var i = 0; i < rs.length; i++) if (rs[i].id === id) return rs[i];
    return null;
  }

  function nextId(rs) {
    var max = 0;
    rs.forEach(function (r) {
      var n = parseInt(String(r.id).replace(/\D/g, ''), 10);
      if (n > max) max = n;
    });
    return 'R' + (max + 1);
  }

  /** 新增登记。status 由规则层算好后传入。 */
  function add(rec) {
    var rs = load();
    rec.id = nextId(rs);
    rec.createdAt = new Date().toISOString();
    rec.versions = [];
    rec.voided = false;
    rs.push(rec);
    save(rs);
    return rec;
  }

  /**
   * 修改记录。
   * 若原记录已确认，先把旧快照 + 修改原因压入 versions，再写入新值，
   * 状态按规则重新判定（可能重新进入待复核）。
   */
  function update(id, patch, changeReason, newStatus, newReviewReasons) {
    var rs = load();
    for (var i = 0; i < rs.length; i++) {
      if (rs[i].id !== id) continue;
      var old = rs[i];
      if (old.status === 'confirmed') {
        old.versions.push({
          snapshot: {
            deviceId: old.deviceId, target: old.target,
            startTime: old.startTime, endTime: old.endTime,
            cloudCover: old.cloudCover, magnitude: old.magnitude,
            observer: old.observer, mountError: old.mountError,
          },
          reason: changeReason || '(未填写原因)',
          changedAt: new Date().toISOString(),
        });
      }
      Object.keys(patch).forEach(function (k) { old[k] = patch[k]; });
      old.status = newStatus;
      old.reviewReasons = newReviewReasons || [];
      old.updatedAt = new Date().toISOString();
      save(rs);
      return old;
    }
    return null;
  }

  /** 复核结论：confirm 确认 / void 作废 */
  function resolve(id, action, note) {
    var rs = load();
    for (var i = 0; i < rs.length; i++) {
      if (rs[i].id !== id) continue;
      if (action === 'confirm') {
        rs[i].status = 'confirmed';
        rs[i].reviewReasons = [];
        rs[i].reviewNote = note || '';
      } else if (action === 'void') {
        rs[i].voided = true;
        rs[i].reviewNote = note || '';
      }
      rs[i].reviewedAt = new Date().toISOString();
      save(rs);
      return rs[i];
    }
    return null;
  }

  return { all: all, byId: byId, add: add, update: update, resolve: resolve };
})();

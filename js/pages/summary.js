/**
 * 页面：当晚摘要
 * 只收录规则层判定为可入摘要的记录（已确认、未作废）；待复核一律不出现。
 */
window.OBS_PAGES = window.OBS_PAGES || {};
window.OBS_PAGES.summary = function (root) {
  var records = window.OBS_STORE.all().filter(window.OBS_RULES.inNightSummary);
  records.sort(function (a, b) { return a.startTime < b.startTime ? -1 : 1; });

  var pendingCount = window.OBS_STORE.all().filter(function (r) {
    return r.status === 'pending' && !r.voided;
  }).length;

  root.innerHTML =
    '<div class="card">' +
      '<h2>当晚摘要 · ' + new Date().toLocaleDateString('zh-CN') + '</h2>' +
      (pendingCount
        ? '<div class="notice warn">另有 ' + pendingCount + ' 条记录待复核，未计入本摘要。</div>'
        : '') +
      (records.length
        ? '<table><tr><th>编号</th><th>目标</th><th>设备</th><th>时段</th><th>云量</th><th>目视星等</th><th>负责人</th></tr>' +
          records.map(function (r) {
            return '<tr><td>' + r.id + '</td><td>' + r.target + '</td><td>' + r.deviceId + '</td>' +
              '<td>' + r.startTime.replace('T', ' ') + ' ~ ' + r.endTime.replace('T', ' ').slice(-5) + '</td>' +
              '<td>' + r.cloudCover + '%</td><td>' + r.magnitude + '</td><td>' + r.observer + '</td></tr>';
          }).join('') + '</table>' +
          '<p class="muted" style="margin-top:10px">共 ' + records.length + ' 条有效观测。</p>'
        : '<p class="muted">今晚暂无有效观测记录。</p>') +
    '</div>';
};

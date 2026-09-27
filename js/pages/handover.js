/**
 * 页面：交接页
 * 交班人一眼看到：未复核任务、故障设备，以及预置任务的完成情况。
 */
window.OBS_PAGES = window.OBS_PAGES || {};
window.OBS_PAGES.handover = function (root) {
  var records = window.OBS_STORE.all();
  var pending = records.filter(function (r) { return r.status === 'pending' && !r.voided; });
  var faultDevs = window.OBS_DEVICES.filter(function (d) { return d.status === 'fault'; });

  // 预置任务完成度：有已确认记录覆盖该目标即算完成
  var doneTargets = records.filter(window.OBS_RULES.inNightSummary).map(function (r) { return r.target; });
  var taskRows = window.OBS_PRESET_TASKS.map(function (t) {
    var done = doneTargets.indexOf(t.target) !== -1;
    return '<tr><td>' + t.id + '</td><td>' + t.target + '</td><td>' + t.suggestedTime + '</td>' +
      '<td>' + (done ? '<span class="badge ok">已完成</span>' : '<span class="badge pending">未完成</span>') + '</td></tr>';
  }).join('');

  root.innerHTML =
    '<div class="card">' +
      '<h2>🔁 交接页 · ' + new Date().toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + '</h2>' +
      '<p class="muted">以下内容请下一班重点关注。</p>' +
    '</div>' +

    '<div class="card">' +
      '<h2>⚠️ 未复核任务（' + pending.length + '）</h2>' +
      (pending.length
        ? '<table><tr><th>编号</th><th>目标</th><th>设备</th><th>开始</th><th>负责人</th><th>待复核原因</th></tr>' +
          pending.map(function (r) {
            return '<tr><td>' + r.id + '</td><td>' + r.target + '</td><td>' + r.deviceId + '</td>' +
              '<td>' + r.startTime.replace('T', ' ') + '</td><td>' + r.observer + '</td>' +
              '<td class="muted">' + (r.reviewReasons || []).join('；') + '</td></tr>';
          }).join('') + '</table>'
        : '<p class="muted">无未复核任务。</p>') +
    '</div>' +

    '<div class="card">' +
      '<h2>🛠 故障设备（' + faultDevs.length + '）</h2>' +
      (faultDevs.length
        ? '<table><tr><th>编号</th><th>设备</th><th>故障说明</th></tr>' +
          faultDevs.map(function (d) {
            return '<tr><td>' + d.id + '</td><td>' + d.name + '</td><td>' + (d.note || '—') + '</td></tr>';
          }).join('') + '</table>'
        : '<p class="muted">所有设备正常。</p>') +
    '</div>' +

    '<div class="card">' +
      '<h2>📋 预置任务完成情况</h2>' +
      '<table><tr><th>编号</th><th>目标</th><th>建议时刻</th><th>状态</th></tr>' + taskRows + '</table>' +
    '</div>';
};

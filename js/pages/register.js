/**
 * 页面：观测登记
 * 登记目标、开始时刻、云量、目视星等、负责人；提交时走规则层判定。
 */
window.OBS_PAGES = window.OBS_PAGES || {};
window.OBS_PAGES.register = function (root) {
  var devices = window.OBS_DEVICES;
  var tasks = window.OBS_PRESET_TASKS;
  var statusMap = window.OBS_DEVICE_STATUS;

  var devOptions = devices.map(function (d) {
    var s = statusMap[d.status];
    var label = d.id + ' · ' + d.name + (d.status === 'fault' ? '（故障）' : '');
    return '<option value="' + d.id + '"' + (d.status === 'fault' ? ' disabled' : '') + '>' + label + '</option>';
  }).join('');

  var taskOptions = '<option value="">（手动填写）</option>' + tasks.map(function (t) {
    return '<option value="' + t.target + '">' + t.id + ' · ' + t.target + '（建议 ' + t.suggestedTime + '）</option>';
  }).join('');

  root.innerHTML =
    '<div class="card">' +
      '<h2>观测登记</h2>' +
      '<div id="msg"></div>' +
      '<form id="regForm">' +
        '<div class="row">' +
          '<label>预置任务<select id="preset">' + taskOptions + '</select></label>' +
          '<label>目标 *<input id="target" required placeholder="如：木星及伽利略卫星"></label>' +
          '<label>设备 *<select id="device">' + devOptions + '</select></label>' +
        '</div>' +
        '<div class="row">' +
          '<label>开始时刻 *<input id="start" type="datetime-local" required></label>' +
          '<label>结束时刻 *<input id="end" type="datetime-local" required></label>' +
          '<label>云量（%）*<input id="cloud" type="number" min="0" max="100" required></label>' +
          '<label>目视星等 *<input id="mag" type="number" step="0.1" required placeholder="如 4.5"></label>' +
          '<label>负责人 *<input id="observer" required placeholder="姓名"></label>' +
        '</div>' +
        '<div class="row">' +
          '<label style="flex-direction:row;align-items:center;gap:6px">' +
            '<input id="mountErr" type="checkbox" style="width:auto"> 赤道仪报错' +
          '</label>' +
        '</div>' +
        '<button type="submit">提交登记</button>' +
      '</form>' +
    '</div>' +
    '<div class="card">' +
      '<h2>设备状态</h2>' +
      '<table><tr><th>编号</th><th>设备</th><th>状态</th><th>备注</th></tr>' +
      devices.map(function (d) {
        var s = statusMap[d.status];
        return '<tr><td>' + d.id + '</td><td>' + d.name + '</td>' +
          '<td><span class="badge ' + s.cls + '">' + s.text + '</span></td>' +
          '<td class="muted">' + (d.note || '—') + '</td></tr>';
      }).join('') +
      '</table>' +
    '</div>';

  document.getElementById('preset').addEventListener('change', function (e) {
    if (e.target.value) document.getElementById('target').value = e.target.value;
  });

  document.getElementById('regForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var rec = {
      deviceId: document.getElementById('device').value,
      target: document.getElementById('target').value.trim(),
      startTime: document.getElementById('start').value,
      endTime: document.getElementById('end').value,
      cloudCover: Number(document.getElementById('cloud').value),
      magnitude: Number(document.getElementById('mag').value),
      observer: document.getElementById('observer').value.trim(),
      mountError: document.getElementById('mountErr').checked,
    };
    var msg = document.getElementById('msg');

    // 规则1：同一台设备时段不能重叠
    var clash = window.OBS_RULES.findOverlap(window.OBS_STORE.all(), rec.deviceId, rec.startTime, rec.endTime, null);
    if (clash) {
      msg.innerHTML = '<div class="notice error">' +
        (clash.invalid
          ? '结束时刻必须晚于开始时刻。'
          : '时段冲突：' + rec.deviceId + ' 在 ' + clash.startTime.replace('T', ' ') +
            ' ~ ' + clash.endTime.replace('T', ' ') + ' 已有「' + clash.target + '」（' + clash.id + '）。') +
        '</div>';
      return;
    }

    // 规则2：云量超四成或赤道仪报错 → 待复核
    var reasons = window.OBS_RULES.reviewReasons(rec);
    rec.status = reasons.length ? 'pending' : 'confirmed';
    rec.reviewReasons = reasons;
    var saved = window.OBS_STORE.add(rec);

    msg.innerHTML = reasons.length
      ? '<div class="notice warn">已登记（' + saved.id + '），因「' + reasons.join('；') + '」转入待复核，复核前不进入当晚摘要。</div>'
      : '<div class="notice info">已登记并确认（' + saved.id + '），进入当晚摘要。</div>';
    e.target.reset();
  });
};

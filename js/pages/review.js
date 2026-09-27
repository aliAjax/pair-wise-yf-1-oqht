/**
 * 页面：待复核
 * 列出待复核记录，可确认 / 作废；已确认记录可在此修改（保留旧版本与原因）。
 */
window.OBS_PAGES = window.OBS_PAGES || {};
window.OBS_PAGES.review = function (root) {
  var records = window.OBS_STORE.all();
  var pending = records.filter(function (r) { return r.status === 'pending' && !r.voided; });
  var confirmed = records.filter(function (r) { return r.status === 'confirmed' && !r.voided; });

  function rowPending(r) {
    return '<tr><td>' + r.id + '</td><td>' + r.target + '</td><td>' + r.deviceId + '</td>' +
      '<td>' + r.startTime.replace('T', ' ') + '</td>' +
      '<td>' + r.cloudCover + '%</td><td>' + r.magnitude + '</td><td>' + r.observer + '</td>' +
      '<td class="muted">' + (r.reviewReasons || []).join('；') + '</td>' +
      '<td>' +
        '<button data-act="confirm" data-id="' + r.id + '">确认有效</button> ' +
        '<button class="danger" data-act="void" data-id="' + r.id + '">作废</button>' +
      '</td></tr>';
  }

  function rowConfirmed(r) {
    var vers = (r.versions || []).map(function (v) {
      return '<div class="version-log">旧值：' + v.snapshot.target + ' / ' + v.snapshot.startTime.replace('T', ' ') +
        ' / 云量' + v.snapshot.cloudCover + '% / 星等' + v.snapshot.magnitude + ' / ' + v.snapshot.observer +
        '<br>原因：' + v.reason + ' · ' + v.changedAt.replace('T', ' ').slice(0, 16) + '</div>';
    }).join('');
    return '<tr><td>' + r.id + '</td><td>' + r.target + vers + '</td><td>' + r.deviceId + '</td>' +
      '<td>' + r.startTime.replace('T', ' ') + '</td>' +
      '<td>' + r.cloudCover + '%</td><td>' + r.magnitude + '</td><td>' + r.observer + '</td>' +
      '<td><button class="ghost" data-act="edit" data-id="' + r.id + '">修改</button></td></tr>';
  }

  root.innerHTML =
    '<div class="card">' +
      '<h2>待复核（' + pending.length + '）</h2>' +
      (pending.length
        ? '<table><tr><th>编号</th><th>目标</th><th>设备</th><th>开始</th><th>云量</th><th>星等</th><th>负责人</th><th>待复核原因</th><th>操作</th></tr>' +
          pending.map(rowPending).join('') + '</table>'
        : '<p class="muted">当前没有待复核记录。</p>') +
    '</div>' +
    '<div class="card">' +
      '<h2>已确认记录（修改将保留旧版本）</h2>' +
      (confirmed.length
        ? '<table><tr><th>编号</th><th>目标 / 历史版本</th><th>设备</th><th>开始</th><th>云量</th><th>星等</th><th>负责人</th><th>操作</th></tr>' +
          confirmed.map(rowConfirmed).join('') + '</table>'
        : '<p class="muted">暂无已确认记录。</p>') +
    '</div>' +
    '<div class="card" id="editCard" style="display:none">' +
      '<h2>修改已确认记录</h2>' +
      '<div id="editMsg"></div>' +
      '<form id="editForm">' +
        '<input type="hidden" id="eid">' +
        '<div class="row">' +
          '<label>目标<input id="etarget" required></label>' +
          '<label>开始时刻<input id="estart" type="datetime-local" required></label>' +
          '<label>结束时刻<input id="eend" type="datetime-local" required></label>' +
          '<label>云量（%）<input id="ecloud" type="number" min="0" max="100" required></label>' +
          '<label>目视星等<input id="emag" type="number" step="0.1" required></label>' +
          '<label>负责人<input id="eobserver" required></label>' +
        '</div>' +
        '<div class="row"><label style="flex:1">修改原因 *<input id="ereason" required placeholder="必填，将随旧版本一并留存"></label></div>' +
        '<button type="submit">保存修改</button> ' +
        '<button type="button" class="ghost" id="cancelEdit">取消</button>' +
      '</form>' +
    '</div>';

  root.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-act]');
    if (!btn) return;
    var id = btn.dataset.id, act = btn.dataset.act;
    if (act === 'confirm') {
      window.OBS_STORE.resolve(id, 'confirm', '复核通过');
      window.OBS_PAGES.review(root);
    } else if (act === 'void') {
      var note = prompt('作废原因（可选）：') || '';
      window.OBS_STORE.resolve(id, 'void', note);
      window.OBS_PAGES.review(root);
    } else if (act === 'edit') {
      var r = window.OBS_STORE.byId(id);
      document.getElementById('editCard').style.display = 'block';
      document.getElementById('eid').value = r.id;
      document.getElementById('etarget').value = r.target;
      document.getElementById('estart').value = r.startTime;
      document.getElementById('eend').value = r.endTime;
      document.getElementById('ecloud').value = r.cloudCover;
      document.getElementById('emag').value = r.magnitude;
      document.getElementById('eobserver').value = r.observer;
      document.getElementById('ereason').value = '';
      document.getElementById('editCard').scrollIntoView();
    }
  });

  document.getElementById('cancelEdit').addEventListener('click', function () {
    document.getElementById('editCard').style.display = 'none';
  });

  document.getElementById('editForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var id = document.getElementById('eid').value;
    var old = window.OBS_STORE.byId(id);
    var patch = {
      target: document.getElementById('etarget').value.trim(),
      startTime: document.getElementById('estart').value,
      endTime: document.getElementById('eend').value,
      cloudCover: Number(document.getElementById('ecloud').value),
      magnitude: Number(document.getElementById('emag').value),
      observer: document.getElementById('eobserver').value.trim(),
    };
    var reason = document.getElementById('ereason').value.trim();
    var msg = document.getElementById('editMsg');

    var clash = window.OBS_RULES.findOverlap(window.OBS_STORE.all(), old.deviceId, patch.startTime, patch.endTime, id);
    if (clash) {
      msg.innerHTML = '<div class="notice error">' +
        (clash.invalid ? '结束时刻必须晚于开始时刻。' : '修改后时段与 ' + clash.id + '（' + clash.target + '）冲突。') +
        '</div>';
      return;
    }
    // 修改后按规则重新判定状态
    var merged = Object.assign({}, old, patch);
    var reasons = window.OBS_RULES.reviewReasons(merged);
    window.OBS_STORE.update(id, patch, reason, reasons.length ? 'pending' : 'confirmed', reasons);
    window.OBS_PAGES.review(root);
  });
};

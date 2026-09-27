/* 页面逻辑 —— 设备、规则均来自独立模块，本文件只负责界面 */

const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

function fmtTime(iso) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function fmtFull(iso) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${fmtTime(iso)}`;
}
function deviceName(id) {
  return (Store.getDevices().find(d => d.id === id) || {}).name || id;
}
function taskName(id) {
  return (TASKS.find(t => t.id === id) || {}).name || id;
}
function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
const STATUS_LABEL = { confirmed: "已确认", pending: "待复核", void: "已作废" };

/* ---------- 标签页 ---------- */
$$(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    $$(".tab").forEach(t => t.classList.remove("active"));
    $$(".page").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    $("#page-" + tab.dataset.page).classList.add("active");
    render();
  });
});

/* ---------- 表单 ---------- */
function fillSelects() {
  $("#fDevice").innerHTML = Store.getDevices()
    .map(d => `<option value="${d.id}">${esc(d.name)}${d.faulty ? "（故障）" : ""}</option>`).join("");
  $("#fTask").innerHTML = TASKS.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join("");
}

$("#obsForm").addEventListener("submit", e => {
  e.preventDefault();
  const editId = $("#editId").value;
  const obs = {
    deviceId: $("#fDevice").value,
    taskId: $("#fTask").value,
    target: $("#fTarget").value.trim(),
    start: $("#fStart").value,
    end: $("#fEnd").value,
    cloud: Number($("#fCloud").value),
    mag: Number($("#fMag").value),
    owner: $("#fOwner").value.trim(),
    mountError: $("#fMountError").checked,
  };

  const errors = Rules.validate({ ...obs, id: editId || null }, Store.getAll());
  if (errors.length) {
    $("#formError").textContent = errors.join("；");
    return;
  }
  $("#formError").textContent = "";

  try {
    if (editId) {
      Store.update(editId, obs, $("#fReason").value);
    } else {
      Store.add(obs);
    }
  } catch (err) {
    $("#formError").textContent = err.message;
    return;
  }
  resetForm();
  render();
});

$("#cancelEdit").addEventListener("click", resetForm);

function resetForm() {
  $("#obsForm").reset();
  $("#editId").value = "";
  $("#fReason").value = "";
  $("#editReasonBox").classList.add("hidden");
  $("#cancelEdit").classList.add("hidden");
  $("#formError").textContent = "";
}

function startEdit(id) {
  const obs = Store.getAll().find(r => r.id === id);
  if (!obs) return;
  $("#editId").value = id;
  $("#fDevice").value = obs.deviceId;
  $("#fTask").value = obs.taskId;
  $("#fTarget").value = obs.target;
  $("#fStart").value = obs.start;
  $("#fEnd").value = obs.end;
  $("#fCloud").value = obs.cloud;
  $("#fMag").value = obs.mag;
  $("#fOwner").value = obs.owner;
  $("#fMountError").checked = obs.mountError;
  // 只有已确认记录才需要“修改原因”，其余修改直接覆盖
  $("#editReasonBox").classList.toggle("hidden", obs.status !== "confirmed");
  $("#fReason").required = obs.status === "confirmed";
  $("#cancelEdit").classList.remove("hidden");
  window.scrollTo(0, 0);
}

/* ---------- 全部记录表 ---------- */
function renderObsTable() {
  const rows = Store.getAll().slice().reverse().map(o => `
    <tr>
      <td>${esc(deviceName(o.deviceId))}</td>
      <td>${esc(o.target)} <span class="hint">(${esc(taskName(o.taskId))})</span></td>
      <td>${fmtFull(o.start)}–${fmtTime(o.end)}</td>
      <td>${o.cloud}%${o.cloud > Rules.CLOUD_LIMIT ? " ⛈" : ""}</td>
      <td>${o.mag}${o.mountError ? " <span title='赤道仪报错'>⚠</span>" : ""}</td>
      <td>${esc(o.owner)}</td>
      <td class="status-${o.status}">${STATUS_LABEL[o.status]}</td>
      <td>
        <button class="small" onclick="startEdit('${o.id}')">修改</button>
        <button class="small" onclick="showHistory('${o.id}')" ${o.history.length ? "" : "disabled"}>历史${o.history.length ? "(" + o.history.length + ")" : ""}</button>
      </td>
    </tr>`).join("");
  $("#obsTable tbody").innerHTML = rows || `<tr><td colspan="8" class="hint">暂无记录</td></tr>`;
}

/* ---------- 待复核 ---------- */
function renderReview() {
  const pending = Store.getAll().filter(o => o.status === "pending");
  $("#reviewBadge").textContent = pending.length || "";

  $("#reviewTable tbody").innerHTML = pending.map(o => `
    <tr>
      <td>${esc(deviceName(o.deviceId))}</td>
      <td>${esc(o.target)}</td>
      <td>${fmtFull(o.start)}–${fmtTime(o.end)}</td>
      <td>${o.cloud}%</td>
      <td>${o.mountError ? "报错 ⚠" : "正常"}</td>
      <td>${esc(o.owner)}</td>
      <td>${esc(Rules.pendingReasons(o).join("；"))}</td>
      <td>
        <button class="small primary" onclick="doReview('${o.id}', true)">确认</button>
        <button class="small danger" onclick="doReview('${o.id}', false)">作废</button>
      </td>
    </tr>`).join("") || `<tr><td colspan="8" class="hint">没有待复核记录</td></tr>`;
}

function doReview(id, approve) {
  Store.review(id, approve);
  render();
}

/* ---------- 当晚摘要（只含已确认） ---------- */
function renderSummary() {
  const confirmed = Store.getAll().filter(o => o.status === "confirmed");
  if (!confirmed.length) {
    $("#summaryBody").innerHTML = `<p class="hint">当晚还没有已确认的观测记录。</p>`;
    return;
  }
  // 按“观测夜”分组：跨午夜的记录归到开始时刻所在夜晚
  const nights = {};
  confirmed.forEach(o => {
    const d = new Date(o.start);
    if (d.getHours() < 12) d.setDate(d.getDate() - 1);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    (nights[key] ||= []).push(o);
  });
  $("#summaryBody").innerHTML = Object.entries(nights).sort().reverse().map(([key, list]) => {
    const list2 = list.sort((a, b) => new Date(a.start) - new Date(b.start));
    const avgCloud = Math.round(list2.reduce((s, o) => s + o.cloud, 0) / list2.length);
    return `<div class="summary-night card">
      <h3>观测夜 ${esc(key)} ｜ ${list2.length} 项已确认 ｜ 平均云量 ${avgCloud}%</h3>
      <ul>${list2.map(o => `<li>${fmtTime(o.start)}–${fmtTime(o.end)}
        <b>${esc(deviceName(o.deviceId))}</b> 观测 ${esc(o.target)}（${esc(taskName(o.taskId))}），
        云量 ${o.cloud}%，目视星等 ${o.mag}，负责人 ${esc(o.owner)}</li>`).join("")}</ul>
    </div>`;
  }).join("");
}

/* ---------- 交接页 ---------- */
function renderHandover() {
  const pending = Store.getAll().filter(o => o.status === "pending");
  $("#handoverPending").innerHTML = pending.map(o =>
    `<li>${esc(deviceName(o.deviceId))} · ${esc(o.target)}（${fmtFull(o.start)} 起）· ${esc(o.owner)}
      <br><span class="hint">原因：${esc(Rules.pendingReasons(o).join("；"))}</span></li>`
  ).join("") || `<li class="hint">无未复核任务</li>`;

  const faulty = Store.getDevices().filter(d => d.faulty);
  $("#handoverFaulty").innerHTML = faulty.map(d =>
    `<li><b>${esc(d.name)}</b>（${esc(d.spec)}）—— 待检修，停止派单</li>`
  ).join("") || `<li class="hint">无故障设备</li>`;
}

/* ---------- 设备维护 ---------- */
function renderDevices() {
  $("#deviceTable tbody").innerHTML = Store.getDevices().map(d => `
    <tr>
      <td>${esc(d.name)}</td>
      <td>${esc(d.spec)}</td>
      <td class="${d.faulty ? "status-pending" : "status-ok"}">${d.faulty ? "故障" : "正常"}</td>
      <td>
        <button class="small ${d.faulty ? "primary" : "danger"}"
          onclick="toggleFault('${d.id}', ${!d.faulty})">
          ${d.faulty ? "标记恢复" : "标记故障"}</button>
      </td>
    </tr>`).join("");
}

function toggleFault(id, faulty) {
  Store.setDeviceFaulty(id, faulty);
  fillSelects();
  render();
}

/* ---------- 历史版本 ---------- */
function showHistory(id) {
  const obs = Store.getAll().find(r => r.id === id);
  if (!obs) return;
  const versions = [
    { ...obs, reason: "当前版本", archivedAt: obs.createdAt, current: true },
    ...obs.history.slice().reverse(),
  ];
  $("#historyBody").innerHTML = versions.map(v => `
    <div class="version-item">
      <div class="meta">${v.current ? "当前" : "旧版本"} ｜ 归档于 ${new Date(v.archivedAt).toLocaleString("zh-CN")} ｜ 修改原因：<b>${esc(v.reason)}</b></div>
      ${esc(v.target)}（${esc(taskName(v.taskId))}）· ${esc(deviceName(v.deviceId))}
      · ${fmtFull(v.start)}–${fmtTime(v.end)} · 云量 ${v.cloud}% · 星等 ${v.mag}
      · 赤道仪${v.mountError ? "报错" : "正常"} · 负责人 ${esc(v.owner)}
      · 状态：${STATUS_LABEL[Rules.computeStatus(v)]}
    </div>`).join("");
  $("#historyDialog").showModal();
}

/* ---------- 整体刷新 ---------- */
function render() {
  renderObsTable();
  renderReview();
  renderSummary();
  renderHandover();
  renderDevices();
}

fillSelects();
render();

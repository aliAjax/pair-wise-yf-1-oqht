/**
 * 数据存取 —— 独立维护
 * 记录持久化在 localStorage；已确认记录被修改时自动保留旧版本与原因。
 */
const Store = {
  KEY: "obs-station-records-v1",

  load() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY)) || [];
    } catch {
      return [];
    }
  },

  save(records) {
    localStorage.setItem(this.KEY, JSON.stringify(records));
  },

  getAll() {
    return this.load();
  },

  /** 新增记录 */
  add(obs) {
    const records = this.load();
    obs.id = "R" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    obs.status = Rules.computeStatus(obs);
    obs.createdAt = new Date().toISOString();
    obs.history = [];
    records.push(obs);
    this.save(records);
    return obs;
  },

  /**
   * 修改记录。
   * 若原记录已确认（confirmed），先把旧版本连同修改原因压入 history。
   */
  update(id, patch, reason) {
    const records = this.load();
    const obs = records.find(r => r.id === id);
    if (!obs) return null;

    if (obs.status === "confirmed") {
      if (!reason || !reason.trim()) {
        throw new Error("修改已确认记录必须填写修改原因");
      }
      const { id: _i, history: _h, ...snapshot } = obs;
      obs.history.push({
        ...snapshot,
        archivedAt: new Date().toISOString(),
        reason: reason.trim(),
      });
    }
    Object.assign(obs, patch);
    obs.status = Rules.computeStatus(obs); // 修改后重新判定状态
    this.save(records);
    return obs;
  },

  /** 复核：确认 或 作废 */
  review(id, approve) {
    const records = this.load();
    const obs = records.find(r => r.id === id);
    if (!obs) return;
    obs.status = approve ? "confirmed" : "void";
    this.save(records);
  },

  /** 设备故障标记（保存在独立的 key 下，与记录分离） */
  DEVICE_KEY: "obs-station-devices-v1",

  loadDeviceFlags() {
    try {
      return JSON.parse(localStorage.getItem(this.DEVICE_KEY)) || {};
    } catch {
      return {};
    }
  },

  setDeviceFaulty(deviceId, faulty) {
    const flags = this.loadDeviceFlags();
    flags[deviceId] = faulty;
    localStorage.setItem(this.DEVICE_KEY, JSON.stringify(flags));
  },

  /** 合并配置与运行态后的设备列表 */
  getDevices() {
    const flags = this.loadDeviceFlags();
    return DEVICES.map(d => ({ ...d, faulty: !!flags[d.id] }));
  },
};

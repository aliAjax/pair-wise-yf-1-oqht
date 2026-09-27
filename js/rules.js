/**
 * 观测规则 —— 独立维护
 * 判定阈值、时段冲突、状态流转都集中在本文件，页面不直接写规则。
 */
const Rules = {
  /** 云量阈值：超过四成（40%）转入待复核 */
  CLOUD_LIMIT: 40,

  /**
   * 校验登记数据，返回错误信息数组（空数组 = 通过）。
   * @param {object} obs 待校验记录
   * @param {Array}  all 现有全部记录
   */
  validate(obs, all) {
    const errors = [];
    const start = new Date(obs.start);
    const end = new Date(obs.end);

    if (isNaN(start) || isNaN(end) || end <= start) {
      errors.push("结束时刻必须晚于开始时刻");
    }
    if (obs.cloud < 0 || obs.cloud > 100) {
      errors.push("云量须在 0–100 之间");
    }
    if (this.hasOverlap(obs, all)) {
      errors.push("同一台设备的观测时段不能重叠");
    }
    const device = DEVICES.find(d => d.id === obs.deviceId);
    if (device && device.faulty) {
      errors.push(`设备「${device.name}」当前标记为故障，不能登记新观测`);
    }
    return errors;
  },

  /** 同一设备时段是否重叠（排除自身与已作废记录） */
  hasOverlap(obs, all) {
    const s1 = new Date(obs.start), e1 = new Date(obs.end);
    return all.some(o => {
      if (o.id === obs.id || o.deviceId !== obs.deviceId || o.status === "void") return false;
      const s2 = new Date(o.start), e2 = new Date(o.end);
      return s1 < e2 && s2 < e1;
    });
  },

  /**
   * 根据记录内容计算状态：
   * 云量超阈值或赤道仪报错 → pending（待复核），否则 confirmed（已确认）。
   */
  computeStatus(obs) {
    if (obs.cloud > this.CLOUD_LIMIT || obs.mountError) return "pending";
    return "confirmed";
  },

  /** 触发待复核的原因说明 */
  pendingReasons(obs) {
    const reasons = [];
    if (obs.cloud > this.CLOUD_LIMIT) reasons.push(`云量 ${obs.cloud}% 超过 ${this.CLOUD_LIMIT}%`);
    if (obs.mountError) reasons.push("赤道仪报错");
    return reasons;
  },
};

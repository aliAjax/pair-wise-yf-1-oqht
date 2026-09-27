/**
 * 设备与任务配置 —— 独立维护
 * 新增/停用望远镜、调整预置任务只改本文件。
 */
const DEVICES = [
  { id: "T1", name: "80ED 折射镜", spec: "80mm / 600mm", faulty: false },
  { id: "T2", name: "150/750 牛反", spec: "150mm / 750mm", faulty: false },
  { id: "T3", name: "C8 施卡",     spec: "203mm / 2032mm", faulty: false },
];

const TASKS = [
  { id: "K1", name: "梅西耶天体巡礼" },
  { id: "K2", name: "变星亮度估测" },
  { id: "K3", name: "月面细节描绘" },
  { id: "K4", name: "双星分解练习" },
];

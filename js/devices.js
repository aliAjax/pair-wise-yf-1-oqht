/**
 * 设备与预置任务 —— 单独维护。
 * 新增/停用望远镜、调整预置任务只改这个文件。
 */
window.OBS_DEVICES = [
  { id: 'T1', name: '8寸道布森（广场角）', status: 'ok',    note: '' },
  { id: 'T2', name: '102ED 折射 + 赤道仪', status: 'ok',    note: '' },
  { id: 'T3', name: 'C8 施卡（天台）',     status: 'fault', note: '赤道仪跟踪漂移，待检修' },
];

/** 预置任务：今晚计划观测的目标 */
window.OBS_PRESET_TASKS = [
  { id: 'P1', target: '木星及伽利略卫星', suggestedTime: '20:00' },
  { id: 'P2', target: 'M31 仙女座星系',   suggestedTime: '21:00' },
  { id: 'P3', target: '月球雨海边缘',     suggestedTime: '22:00' },
  { id: 'P4', target: 'M13 武仙座球状星团', suggestedTime: '23:00' },
];

/** 设备状态文案 */
window.OBS_DEVICE_STATUS = {
  ok:    { text: '正常', cls: 'ok' },
  fault: { text: '故障', cls: 'fault' },
};

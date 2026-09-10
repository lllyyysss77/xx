/**
 * 倒排工期日期计算工具
 * 输入 D 日（正式选举日），根据 offsetLabel 自动推算每个阶段的起止日期
 */
import { DocxStageItem } from './docxRules';

export interface ComputedStage {
  stageKey: string;
  stageName: string;
  offsetLabel: string;
  startDate: string;  // YYYY-MM-DD
  endDate: string;    // YYYY-MM-DD
  duration: number;   // 天数
  workItems: string;
  announcementNums: string;
  systemAction: string;
}

/**
 * 解析 offsetLabel 为相对于 D 日的天数偏移
 * 支持格式：
 *   "D-35"       → { start: -35, end: -35 }
 *   "D-33~D-29"  → { start: -33, end: -29 }
 *   "D日"        → { start: 0, end: 0 }
 *   "D+1~D+5"    → { start: 1, end: 5 }
 */
function parseOffset(label: string): { start: number; end: number } {
  // D日
  if (label === 'D日') return { start: 0, end: 0 };

  // 范围格式：D-x~D-y 或 D+x~D+y
  const rangeMatch = label.match(/D([+-]?\d+)~D([+-]?\d+)/);
  if (rangeMatch) {
    return {
      start: Number(rangeMatch[1]),
      end: Number(rangeMatch[2]),
    };
  }

  // 单日格式：D-x 或 D+x
  const singleMatch = label.match(/D([+-]?\d+)/);
  if (singleMatch) {
    const v = Number(singleMatch[1]);
    return { start: v, end: v };
  }

  return { start: 0, end: 0 };
}

/**
 * 在 D 日基础上加减天数
 */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * 根据 D 日和阶段定义，计算所有阶段的实际日期
 */
export function computeSchedule(
  dDay: string,
  stages: DocxStageItem[],
): ComputedStage[] {
  return stages.map((s) => {
    const { start, end } = parseOffset(s.offsetLabel);
    const startDate = addDays(dDay, start);
    const endDate = addDays(dDay, end);
    const duration = end - start + 1;
    return {
      stageKey: s.stageKey,
      stageName: s.stageName,
      offsetLabel: s.offsetLabel,
      startDate,
      endDate,
      duration,
      workItems: s.workItems,
      announcementNums: s.announcementNums,
      systemAction: s.systemAction,
    };
  });
}

/**
 * 根据当前日期判断阶段状态
 */
export function getStageStatus(
  stage: ComputedStage,
  today: string = new Date().toISOString().slice(0, 10),
): 'done' | 'current' | 'todo' {
  if (stage.endDate < today) return 'done';
  if (stage.startDate <= today && today <= stage.endDate) return 'current';
  return 'todo';
}

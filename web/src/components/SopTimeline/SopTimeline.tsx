/**
 * 核心固定组件：Pipeline法定时间轴展板 (SOP Timeline)
 * —— 任何页面（首页、活动详情、阶段查看）直接复用调用
 */
import React from 'react';
import { Steps, Tag } from 'tdesign-react';
import { CheckCircleFilledIcon, TimeIcon } from 'tdesign-icons-react';
import { FiefStage } from '../../api/elections';
import { StatusTag } from '../StatusTag';

const { StepItem } = Steps;

interface SopTimelineProps {
  stages: FiefStage[];
  currentStageKey?: string;
}

export const SopTimeline: React.FC<SopTimelineProps> = ({ stages, currentStageKey }) => {
  if (!stages || stages.length === 0) {
    return <div style={{ color: '#999', padding: '16px 0' }}>暂无法定日程数据</div>;
  }

  // 法定工期按今日真实日期动态推导状态（解决恒 0% / 恒 not_started）
  const todayStr = new Date().toISOString().slice(0, 10);
  const enrichedStages = stages.map((s) => {
    let effectiveStatus = s.status;
    if (s.endDate && s.endDate < todayStr) {
      effectiveStatus = 'completed';
    } else if (s.startDate && s.endDate && todayStr >= s.startDate && todayStr <= s.endDate) {
      effectiveStatus = 'in_progress';
    } else if (s.startDate && s.startDate > todayStr) {
      effectiveStatus = 'not_started';
    }
    return { ...s, effectiveStatus };
  });

  // 找到当前进行中的步骤序号
  let currentIdx = enrichedStages.findIndex((s) => s.effectiveStatus === 'in_progress');
  if (currentIdx === -1) {
    currentIdx = enrichedStages.findIndex((s) => s.effectiveStatus === 'not_started');
  }
  if (currentIdx === -1) currentIdx = enrichedStages.length;

  return (
    <div className="sop-timeline" style={{ padding: '12px 0' }}>
      <Steps layout="vertical" current={currentIdx} sequence="positive">
        {enrichedStages.map((s) => {
          const isDone = s.effectiveStatus === 'completed';
          const isCurrent = s.effectiveStatus === 'in_progress' || s.stageKey === currentStageKey;

          return (
            <StepItem
              key={s.id || s.stageKey}
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: isCurrent ? 600 : 400 }}>{s.stageName}</span>
                  <StatusTag type="stage" status={s.effectiveStatus} />
                </div>
              }
              content={
                <div style={{ color: '#666', fontSize: 13, marginTop: 4 }}>
                  <span>法定执行周期：{s.startDate} 至 {s.endDate}</span>
                </div>
              }
              icon={
                isDone ? (
                  <CheckCircleFilledIcon style={{ color: '#00a870' }} />
                ) : isCurrent ? (
                  <TimeIcon style={{ color: '#0052d9' }} />
                ) : undefined
              }
            />
          );
        })}
      </Steps>
    </div>
  );
};

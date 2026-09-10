import React, { useMemo, useState } from 'react';
import {
  Card,
  DatePicker,
  Radio,
  Tag,
  Button,
  Space,
  Tooltip,
} from 'tdesign-react';
import { CalendarIcon, InfoCircleFilledIcon } from 'tdesign-icons-react';
import { VILLAGE_DOCX_STAGES, COMMUNITY_DOCX_STAGES } from '../../utils/docxRules';
import { computeSchedule, getStageStatus } from '../../utils/scheduleCalculator';
import Style from './ScheduleBoard.module.less';

export default function ScheduleBoard() {
  const today = new Date().toISOString().slice(0, 10);

  // 默认 D 日：35 天后
  const defaultDDay = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 35);
    return d.toISOString().slice(0, 10);
  })();

  const [dDay, setDDay] = useState<string>(defaultDDay);
  const [orgType, setOrgType] = useState<'village' | 'community'>('village');

  const stages = useMemo(
    () => computeSchedule(dDay, orgType === 'village' ? VILLAGE_DOCX_STAGES : COMMUNITY_DOCX_STAGES),
    [dDay, orgType],
  );

  // 总范围
  const range = useMemo(() => {
    if (stages.length === 0) return { min: dDay, max: dDay, totalDays: 1 };
    const min = stages[0].startDate;
    const max = stages[stages.length - 1].endDate;
    const totalDays =
      Math.floor((new Date(max + 'T00:00:00').getTime() - new Date(min + 'T00:00:00').getTime()) / 86400000) + 1;
    return { min, max, totalDays };
  }, [stages, dDay]);

  // 今日位置
  const todayPos = useMemo(() => {
    if (today < range.min) return 0;
    if (today > range.max) return 100;
    const offset =
      Math.floor((new Date(today + 'T00:00:00').getTime() - new Date(range.min + 'T00:00:00').getTime()) / 86400000);
    return (offset / (range.totalDays - 1)) * 100;
  }, [today, range]);

  const statusLabel: Record<string, { label: string; theme: string }> = {
    done: { label: '已完成', theme: 'success' },
    // 「进行中」是正常态：红色全站只留给驳回/超期
    current: { label: '进行中', theme: 'primary' },
    todo: { label: '未开始', theme: 'default' },
  };

  const handleExport = () => {
    const lines = [
      `城厢区村居换届倒排工期表`,
      `正式选举日（D日）：${dDay}`,
      `组织类型：${orgType === 'village' ? '行政村' : '社区'}`,
      `生成时间：${today}`,
      '',
      '序号\t阶段\t起止日期\t天数\t法定公告\t核心工作',
    ];
    stages.forEach((s, i) => {
      lines.push(
        `${i + 1}\t${s.stageName}（${s.offsetLabel}）\t${s.startDate} ~ ${s.endDate}\t${s.duration}天\t${s.announcementNums}\t${s.workItems.split('\n')[0]}`,
      );
    });
    const text = lines.join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `倒排工期表_${dDay}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const dayToPct = (dateStr: string) => {
    const offset =
      Math.floor((new Date(dateStr + 'T00:00:00').getTime() - new Date(range.min + 'T00:00:00').getTime()) / 86400000);
    return (offset / (range.totalDays - 1)) * 100;
  };

  return (
    <div className={Style.wrap}>
      {/* 顶部控制栏 */}
      <Card bordered={false} className={Style.headerCard}>
        <div className={Style.headerRow}>
          <div className={Style.title}>
            <CalendarIcon style={{ color: '#B22222' }} />
            <span>换届倒排工期计算器</span>
          </div>
          <div className={Style.controls}>
            <Space>
              <Radio.Group value={orgType} onChange={(v: any) => setOrgType(v)} variant="default-filled">
                <Radio.Button value="village"> 行政村</Radio.Button>
                <Radio.Button value="community"> 社区</Radio.Button>
              </Radio.Group>
              <DatePicker
                value={dDay}
                onChange={(v: any) => v && setDDay(String(v).slice(0, 10))}
                placeholder="选择正式选举日（D日）"
                style={{ width: 220 }}
              />
              <Button variant="outline" onClick={handleExport}>导出工期表</Button>
            </Space>
          </div>
        </div>
        <div className={Style.subInfo}>
          <Tag theme="primary" variant="light">正式选举日：{dDay}</Tag>
          <Tag theme="warning" variant="light">今日：{today}</Tag>
          <Tag theme="default" variant="outline">共 {stages.length} 个法定阶段，总工期 {range.totalDays} 天</Tag>
        </div>
      </Card>

      {/* 甘特图 */}
      <Card bordered={false} className={Style.ganttCard}>
        <div className={Style.ganttHeader}>
          <div className={Style.stageCol}>阶段名称</div>
          <div className={Style.timelineCol}>
            <div className={Style.timeAxis}>
              {['D-30', 'D-20', 'D-10', 'D日', 'D+5', 'D+10'].map((label) => {
                // 找对应阶段计算位置
                const stage = stages.find((s) => s.offsetLabel === label || s.offsetLabel.startsWith(label + '~') || s.offsetLabel.startsWith(label));
                const pos = stage ? dayToPct(stage.startDate) : 0;
                if (pos <= 0 || pos >= 100) return null;
                return (
                  <div key={label} className={Style.tickLabel} style={{ left: `${pos}%` }}>
                    <span>{stage?.startDate.slice(5) || ''}</span>
                    <span className={Style.tickOffset}>{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 今日红线 */}
        <div className={Style.todayLine} style={{ left: `calc(200px + ${todayPos} * (100% - 200px) / 100)` }}>
          <span className={Style.todayTag}>今日</span>
        </div>

        <div className={Style.ganttBody}>
          {stages.map((s, idx) => {
            const status = getStageStatus(s, today);
            const leftPct = dayToPct(s.startDate);
            const widthPct = ((s.duration - 1) / (range.totalDays - 1)) * 100 + 0.5;

            return (
              <div key={s.stageKey} className={Style.ganttRow}>
                <div className={Style.stageCol}>
                  <div className={Style.stageIndex}>{String(idx + 1).padStart(2, '0')}</div>
                  <div className={Style.stageInfo}>
                    <div className={Style.stageName}>{s.stageName}</div>
                    <div className={Style.stageDate}>
                      {s.startDate.slice(5)} ~ {s.endDate.slice(5)} · {s.duration}天
                    </div>
                  </div>
                  <Tag size="small" theme={statusLabel[status].theme as any} variant="light">
                    {statusLabel[status].label}
                  </Tag>
                </div>
                <div className={Style.timelineCol}>
                  <Tooltip
                    content={
                      <div style={{ maxWidth: 300 }}>
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>
                          {s.stageName}（{s.offsetLabel}）
                        </div>
                        <div style={{ fontSize: 12, marginBottom: 4 }}>
                          周期：{s.startDate} ~ {s.endDate}（{s.duration}天）
                        </div>
                        <div style={{ fontSize: 12, marginBottom: 4 }}>
                          法定公告：{s.announcementNums}
                        </div>
                        <div style={{ fontSize: 12 }}>核心工作：{s.workItems.split('\n')[0]}</div>
                      </div>
                    }
                    placement="right"
                  >
                    <div
                      className={`${Style.bar} ${Style[`bar-${status}`]}`}
                      style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 1.5)}%` }}
                    >
                      <span className={Style.barLabel}>{s.offsetLabel}</span>
                    </div>
                  </Tooltip>
                </div>
              </div>
            );
          })}
        </div>

        <div className={Style.legend}>
          <span className={Style.legendItem}>
            <span className={`${Style.legendDot} ${Style.legendDone}`} />已完成
          </span>
          <span className={Style.legendItem}>
            <span className={`${Style.legendDot} ${Style.legendCurrent}`} />进行中
          </span>
          <span className={Style.legendItem}>
            <span className={`${Style.legendDot} ${Style.legendTodo}`} />未开始
          </span>
          <span className={Style.legendTip}>
            <InfoCircleFilledIcon style={{ color: '#E7700B', marginRight: 4 }} />
            修改上方 D 日，所有阶段日期自动倒推
          </span>
        </div>
      </Card>
    </div>
  );
}

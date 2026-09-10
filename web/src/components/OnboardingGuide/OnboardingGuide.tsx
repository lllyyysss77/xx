/**
 * 首次使用引导（新用户进入后台后的欢迎弹窗）
 * - 仅首次出现：localStorage 记忆，不重复打扰
 * - 政务专业文案：说明系统定位、主干流程、四个高频入口
 * - 可随时从首页「使用指南」按钮重新打开
 */
import React, { useState } from 'react';
import { Dialog, Button, Space } from 'tdesign-react';
import { FileAddIcon, CalendarIcon, NotificationIcon, UserCircleIcon } from 'tdesign-icons-react';
import { useNavigate } from 'react-router-dom';

const STORAGE_KEY = 'cxq_onboarding_done_v1';

const FLOW_STEPS = [
  {
    key: 'proposal',
    title: '发起换届提案',
    desc: '录入法定选举日（D 日）、岗位职数与任职要求，提交上级审批。提案是全部后续流程的起点。',
    icon: <FileAddIcon />,
    path: '/election/proposals',
    module: '选举提案',
  },
  {
    key: 'activity',
    title: '审批通过生成活动',
    desc: '提案审批通过后，系统自动按 D 日倒排生成 16 个法定阶段日程，并派生全套公告草稿。',
    icon: <CalendarIcon />,
    path: '/election/activities',
    module: '换届活动',
  },
  {
    key: 'announcement',
    title: '按节点发布公文',
    desc: '在活动工作台按阶段编辑、核准并发布红头公文；公告一经发布即对参选人端公开。',
    icon: <NotificationIcon />,
    path: '/election/announcements',
    module: '公告发文',
  },
  {
    key: 'material',
    title: '受理材料并组织联审',
    desc: '受理参选人报名材料，初审通过进入候选人池；逐轮回填镇街初审、区级联审、党委考察结论。',
    icon: <UserCircleIcon />,
    path: '/election/materials',
    module: '报名材料',
  },
];

interface Props {
  /** 是否强制显示（首页「使用指南」按钮） */
  forceOpen?: boolean;
  onClose?: () => void;
}

export default function OnboardingGuide({ forceOpen = false, onClose }: Props) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(() => {
    if (forceOpen) return true;
    try {
      return localStorage.getItem(STORAGE_KEY) !== 'done';
    } catch {
      return false;
    }
  });
  const [step, setStep] = useState(0);

  const close = () => {
    if (!forceOpen) {
      try {
        localStorage.setItem(STORAGE_KEY, 'done');
      } catch {}
    }
    setVisible(false);
    onClose?.();
  };

  const current = FLOW_STEPS[step];

  return (
    <Dialog
      visible={visible}
      onClose={close}
      header="欢迎使用村居换届选举工作平台"
      width={560}
      footer={
        <Space>
          <Button variant="outline" onClick={close}>
            跳过引导
          </Button>
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              上一步
            </Button>
          )}
          {step < FLOW_STEPS.length - 1 ? (
            <Button theme="primary" onClick={() => setStep(step + 1)}>
              下一步（{step + 1}/{FLOW_STEPS.length}）
            </Button>
          ) : (
            <Button theme="primary" onClick={() => { setStep(0); close(); }}>
              进入工作台
            </Button>
          )}
        </Space>
      }
    >
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* 左侧步骤指示 */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
          {FLOW_STEPS.map((s, i) => (
            <div
              key={s.key}
              onClick={() => setStep(i)}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                cursor: 'pointer',
                background: i === step ? 'var(--td-brand-color)' : i < step ? 'var(--td-brand-color-4, #93aae6)' : 'var(--td-component-stroke, #dcdcdc)',
              }}
            />
          ))}
        </div>
        {/* 右侧内容 */}
        <div style={{ flex: 1, minHeight: 150 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--td-text-color-primary)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ color: 'var(--td-brand-color)', fontSize: 20, display: 'inline-flex' }}>{current.icon}</span>
            第 {step + 1} 步 · {current.title}
          </div>
          <p style={{ margin: '0 0 16px', color: 'var(--td-text-color-secondary)', lineHeight: 1.7, fontSize: 13 }}>
            {current.desc}
          </p>
          <Button variant="text" size="small" onClick={() => { navigate(current.path); close(); }}>
            前往「{current.module}」模块
          </Button>
          <div style={{ marginTop: 16, padding: '10px 12px', background: 'var(--td-brand-color-light, #f1f4fb)', borderRadius: 6, fontSize: 12, color: 'var(--td-text-color-secondary)', lineHeight: 1.7 }}>
            温馨提示：各阶段日期均以法定选举日（D 日）倒排自动推算，请先确认 D 日准确后再推进后续流程；投票计票依规在线下组织，本平台负责过程留痕、公文发布与材料归档。
          </div>
        </div>
      </div>
    </Dialog>
  );
}

/** 是否已完成首次引导（供外部判断是否显示「使用指南」入口） */
export function hasOnboarded(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'done';
  } catch {
    return true;
  }
}

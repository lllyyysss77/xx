/**
 * 美美的引导提示组件（基于 tippy.js）
 * 支持：悬浮提示、分步引导 Tour、点击后自动下一步
 */
import React, { useState, useCallback } from 'react';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/animations/scale.css';
import './GuideTip.less';

export interface GuideStep {
  target: string;      // 目标元素的 data-guide 属性值
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end' | 'left-start' | 'left-end' | 'right-start' | 'right-end';
  nextText?: string;   // 下一步按钮文案
  action?: () => void; // 点击下一步时额外执行的动作
}

interface GuideTipProps {
  title?: string;
  content: React.ReactNode;
  children: React.ReactElement;
  placement?: any;
  trigger?: 'mouseenter focus' | 'click' | 'manual';
  visible?: boolean;
  onVisibleChange?: (v: boolean) => void;
  step?: { current: number; total: number };
  onNext?: () => void;
  onPrev?: () => void;
  onDone?: () => void;
  highlight?: boolean;
}

export const GuideTip: React.FC<GuideTipProps> = ({
  title,
  content,
  children,
  placement = 'top',
  trigger = 'mouseenter focus',
  visible,
  onVisibleChange,
  step,
  onNext,
  onPrev,
  onDone,
  highlight = false,
}) => {
  return (
    <Tippy
      placement={placement}
      trigger={trigger}
      visible={visible}
      onShow={() => onVisibleChange?.(true)}
      onHide={() => onVisibleChange?.(false)}
      animation="scale"
      theme="guide-tip"
      arrow={true}
      interactive={true}
      interactiveBorder={20}
      offset={[0, 10]}
      delay={[100, 50]}
      duration={[220, 180]}
      appendTo={document.body}
      className={highlight ? 'guide-tip-highlight' : ''}
      content={
        <div className="guide-tip-inner">
          {title && (
            <div className="guide-tip-title">
              <span className="guide-tip-dot" />
              {title}
            </div>
          )}
          <div className="guide-tip-body">{content}</div>
          {step && (
            <div className="guide-tip-footer">
              <div className="guide-tip-step-indicator">
                {Array.from({ length: step.total }).map((_, i) => (
                  <span
                    key={i}
                    className={`guide-tip-dot-indicator ${i + 1 === step.current ? 'active' : ''}`}
                  />
                ))}
              </div>
              <div className="guide-tip-actions">
                {onPrev && step.current > 1 && (
                  <button className="guide-tip-btn guide-tip-btn-ghost" onClick={onPrev}>
                    上一步
                  </button>
                )}
                {onNext && step.current < step.total && (
                  <button className="guide-tip-btn guide-tip-btn-primary" onClick={onNext}>
                    {step.current === 1 ? '开始了解' : '下一步'} →
                  </button>
                )}
                {onDone && step.current === step.total && (
                  <button className="guide-tip-btn guide-tip-btn-primary" onClick={onDone}>
                    完成 ✓
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      }
    >
      {children}
    </Tippy>
  );
};

/**
 * 分步引导 Tour Hook
 * @param steps 引导步骤配置
 * @param storageKey localStorage 键，用于记住用户是否已看过
 */
export function useGuideTour(steps: GuideStep[], storageKey?: string) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isActive, setIsActive] = useState(() => {
    if (!storageKey) return false;
    try {
      return localStorage.getItem(storageKey) !== 'done';
    } catch { return false; }
  });
  const [isDone, setIsDone] = useState(() => {
    if (!storageKey) return false;
    try {
      return localStorage.getItem(storageKey) === 'done';
    } catch { return false; }
  });

  const next = useCallback(() => {
    if (currentIdx < steps.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      setIsActive(false);
      setIsDone(true);
      if (storageKey) {
        try { localStorage.setItem(storageKey, 'done'); } catch {}
      }
    }
  }, [currentIdx, steps.length, storageKey]);

  const prev = useCallback(() => {
    if (currentIdx > 0) setCurrentIdx(currentIdx - 1);
  }, [currentIdx]);

  const done = useCallback(() => {
    setIsActive(false);
    setIsDone(true);
    if (storageKey) {
      try { localStorage.setItem(storageKey, 'done'); } catch {}
    }
  }, [storageKey]);

  const start = useCallback(() => {
    setCurrentIdx(0);
    setIsActive(true);
    setIsDone(false);
    if (storageKey) {
      try { localStorage.removeItem(storageKey); } catch {}
    }
  }, [storageKey]);

  const current = steps[currentIdx];

  return {
    current,
    currentIdx,
    isActive,
    isDone,
    next,
    prev,
    done,
    start,
    total: steps.length,
  };
}

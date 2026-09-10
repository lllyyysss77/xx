/**
 * 核心固定组件：红头公告发文与法定公文展板
 * —— 按照政务标准红头文件格式排版，小编根本不需要设计样式
 */
import React from 'react';
import { Card, Divider, Space, Tag } from 'tdesign-react';
import { Announcement } from '../../api/announcements';

interface LegalDocViewerProps {
  announcement: Partial<Announcement>;
  orgName?: string;
  orgType?: 'village' | 'community';
}

export const LegalDocViewer: React.FC<LegalDocViewerProps> = ({
  announcement,
  orgName = '本单位',
  orgType = 'village',
}) => {
  const isCommunity = orgType === 'community';
  const defaultSign = announcement.annSign || (isCommunity ? `${orgName}居民选举委员会` : `${orgName}村民选举委员会`);
  const defaultDate = announcement.annSignDate || (announcement.publishedAt ? announcement.publishedAt.slice(0, 10) : '2026年XX月XX日');

  return (
    <div
      className="legal-doc-viewer"
      style={{
        maxWidth: 760,
        margin: '0 auto',
        padding: '36px 48px',
        backgroundColor: '#fff',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        borderRadius: 4,
        fontFamily: 'SimSun, "Songti SC", serif',
        color: '#222',
        lineHeight: 1.8,
      }}
    >
      {/* 红头公文标头 */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h1
          style={{
            color: '#d50000',
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: 2,
            marginBottom: 12,
            fontFamily: 'SimHei, "Heiti SC", sans-serif',
          }}
        >
          {defaultSign}
        </h1>
        <div style={{ color: '#d50000', fontSize: 18, letterSpacing: 4, fontWeight: 600 }}>
          公 告
        </div>
        <Divider style={{ borderColor: '#d50000', borderWidth: 2, margin: '16px 0 28px' }} />
      </div>

      {/* 标题 */}
      <h2
        style={{
          textAlign: 'center',
          fontSize: 20,
          fontWeight: 600,
          marginBottom: 28,
          fontFamily: 'SimHei, "Heiti SC", sans-serif',
        }}
      >
        {announcement.title || '（公告标题）'}
      </h2>

      {/* 正文：按标准公文段落格式排版 */}
      <div
        style={{
          fontSize: 16,
          whiteSpace: 'pre-wrap',
          minHeight: 240,
          textAlign: 'justify',
          textIndent: '2em',
        }}
      >
        {announcement.body || '（暂无正文内容）'}
      </div>

      {/* 落款与成文日期 */}
      <div style={{ marginTop: 48, textAlign: 'right', paddingRight: 24 }}>
        <div style={{ fontSize: 16, fontWeight: 600 }}>{defaultSign}</div>
        <div style={{ fontSize: 15, color: '#444', marginTop: 8 }}>{defaultDate}</div>
      </div>
    </div>
  );
};

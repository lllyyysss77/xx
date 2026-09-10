import React from 'react';
import { Layout, Row } from 'tdesign-react';
import { useUiStore } from 'stores/useUiStore';

const { Footer: TFooter } = Layout;

const Footer = () => {
  const showFooter = useUiStore((s) => s.showFooter);
  if (!showFooter) {
    return null;
  }

  return (
    <TFooter style={{ backgroundColor: '#1a1f36', color: 'rgba(255, 255, 255, 0.55)', padding: '16px 0', fontSize: '12px', letterSpacing: '1px' }}>
      <Row justify="center">换届选举系统 v1 © {new Date().getFullYear()}</Row>
    </TFooter>
  );
};

export default React.memo(Footer);

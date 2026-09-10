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
    <TFooter>
      <Row justify="center">城厢区村居换届选举系统 · 内部政务工作台 © {new Date().getFullYear()}</Row>
    </TFooter>
  );
};

export default React.memo(Footer);

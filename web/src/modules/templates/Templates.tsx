import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Radio,
  Dialog,
  MessagePlugin,
  Input,
  Row,
  Col,
} from 'tdesign-react';
import { FileCopyIcon, BrowseIcon, SearchIcon } from 'tdesign-icons-react';
import { getAnnouncementTemplates, AnnouncementTemplate } from '../../api/announcements';
import { useAuthStore } from '../../stores/useAuthStore';
import { LegalDocViewer } from '../../components/LegalDocViewer';

export default function TemplatesPage() {
  const [list, setList] = useState<AnnouncementTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'village' | 'community'>('village');
  const [searchKey, setSearchKey] = useState('');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [currentTpl, setCurrentTpl] = useState<AnnouncementTemplate | null>(null);

  const { user } = useAuthStore();

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getAnnouncementTemplates({ orgType: activeTab });
      setList(data);
    } catch (err: any) {
      MessagePlugin.error(err.message || '加载公文模板库失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  // 复制正文到剪贴板
  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      MessagePlugin.success('模板正文及占位符已成功复制到剪贴板！');
    });
  };

  const filteredList = list.filter((item) => {
    if (!searchKey) return true;
    return (
      item.atCode.toLowerCase().includes(searchKey.toLowerCase()) ||
      item.atName.toLowerCase().includes(searchKey.toLowerCase()) ||
      item.atContent.toLowerCase().includes(searchKey.toLowerCase())
    );
  });

  const columns = [
    {
      colKey: 'atCode',
      title: '文号',
      width: 92,
      cell: ({ row }: any) => <strong style={{ color: '#0052d9', whiteSpace: 'nowrap' }}>{row.atCode}</strong>,
    },
    {
      colKey: 'atName',
      title: '法定公文名称',
      // 不设固定宽度：自动占满剩余空间，从根上消除横向滚动；长标题自然换行
      cell: ({ row }: any) => (
        <span style={{ fontWeight: 500, color: '#1d2129', lineHeight: 1.5 }}>{row.atName}</span>
      ),
    },
    {
      colKey: 'atVersion',
      title: '版本',
      width: 88,
      // [FIXED 2026-09-10] 版本列读接口真实字段 atVersion，不再写死“2026版”
      cell: ({ row }: any) => (
        <Tag size="small" theme="default" variant="light">{row.atVersion || '通用'}</Tag>
      ),
    },
    {
      colKey: 'op',
      title: '操作',
      width: 88,
      cell: ({ row }: any) => (
        <Space size={2}>
          <Button
            theme="primary"
            variant="text"
            shape="square"
            size="small"
            icon={<BrowseIcon />}
            title="查看全文红头排版预览"
            onClick={() => {
              setCurrentTpl(row);
              setPreviewVisible(true);
            }}
          />
          <Button
            theme="default"
            variant="text"
            shape="square"
            size="small"
            icon={<FileCopyIcon />}
            title="一键复制模板正文"
            onClick={() => handleCopy(row.atContent)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="法定公文快捷模板库"
        description="系统内置全套法定发文模板（依据换届选举法定文书规范编制）。村委会版与居委会版分轨维护，正文支持按实情填写落款、日期等信息。"
        actions={
          <Input
            style={{ width: 240 }}
            value={searchKey}
            onChange={(v) => setSearchKey(v)}
            placeholder="搜索公告编号或标题..."
            prefixIcon={<SearchIcon />}
            clearable
          />
        }
      >
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Radio.Group
            value={activeTab}
            onChange={(v: any) => setActiveTab(v)}
            variant="default-filled"
            size="large"
          >
            <Radio.Button value="village">村委会版法定模板</Radio.Button>
            <Radio.Button value="community">居委会版法定模板</Radio.Button>
          </Radio.Group>

          <span style={{ color: 'var(--td-text-color-secondary, #888)', fontSize: 13 }}>
            当前筛选 {filteredList.length} 套模板
          </span>
        </div>

        <Table data={filteredList} columns={columns} rowKey="id" loading={loading} />
      </Card>

      {/* 模板正文预览弹窗 */}
      <Dialog
        header={`模板原文预览 · ${currentTpl?.atName || ''}`}
        visible={previewVisible}
        onClose={() => setPreviewVisible(false)}
        footer={
          <Space>
            <Button
              theme="primary"
              icon={<FileCopyIcon />}
              onClick={() => {
                if (currentTpl) handleCopy(currentTpl.atContent);
              }}
            >
              复制模板正文
            </Button>
            <Button onClick={() => setPreviewVisible(false)}>关闭</Button>
          </Space>
        }
        width={780}
      >
        {currentTpl && (
          <LegalDocViewer
            announcement={{
              title: currentTpl.atName,
              body: currentTpl.atContent,
              annSign: activeTab === 'community' ? '{{某某社区}}居民选举委员会' : '{{某某村}}村民选举委员会',
              annSignDate: '{{成文日期}}',
            }}
            orgName={user?.orgName || '本单位'}
            orgType={activeTab}
          />
        )}
      </Dialog>
    </div>
  );
}

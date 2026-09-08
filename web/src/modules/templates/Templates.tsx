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
      title: '公文编码',
      width: 120,
      cell: ({ row }: any) => <strong style={{ color: '#0052d9' }}>{row.atCode}</strong>,
    },
    {
      colKey: 'atName',
      title: '法定公文名称',
      width: 320,
      cell: ({ row }: any) => (
        <span style={{ fontWeight: 500, color: '#1d2129' }}>{row.atName}</span>
      ),
    },
    {
      colKey: 'atVersion',
      title: '适用法案版本',
      width: 150,
      cell: ({ row }: any) => (
        <Tag theme={activeTab === 'community' ? 'warning' : 'primary'} variant="light">
          {activeTab === 'community' ? '居委会组织法版' : '村民委员会组织法版'}
        </Tag>
      ),
    },
    {
      colKey: 'atNeedRemind',
      title: '到期提醒机制',
      width: 140,
      cell: ({ row }: any) => (
        <Tag theme={row.atNeedRemind ? 'warning' : 'default'} variant="light">
          {row.atNeedRemind ? '⏰ 提前24小时' : '无特殊提醒'}
        </Tag>
      ),
    },
    {
      colKey: 'op',
      title: '操作',
      width: 200,
      cell: ({ row }: any) => (
        <Space>
          <Button
            theme="default"
            variant="text"
            size="small"
            icon={<BrowseIcon />}
            onClick={() => {
              setCurrentTpl(row);
              setPreviewVisible(true);
            }}
          >
            全文预览
          </Button>
          <Button
            theme="primary"
            variant="text"
            size="small"
            icon={<FileCopyIcon />}
            onClick={() => handleCopy(row.atContent)}
          >
            一键复制
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="法定公文快捷模板库"
        description="系统内置全套 18 篇法定发文模板（依据甲方 DOCX 编制）。村委会版与居委会版物理彻底分轨，正文包含 {{组织名称}}、{{届次}}、{{选举日}} 等法定占位符。"
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
            <Radio.Button value="village">🏡 村委会版法定模板 (18套)</Radio.Button>
            <Radio.Button value="community">🏘 居委会版法定模板 (18套)</Radio.Button>
          </Radio.Group>

          <span style={{ color: '#888', fontSize: 13 }}>
            共包含 {filteredList.length} 套法定公文模板
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
            orgName={user?.orgName || '演示单位'}
            orgType={activeTab}
          />
        )}
      </Dialog>
    </div>
  );
}

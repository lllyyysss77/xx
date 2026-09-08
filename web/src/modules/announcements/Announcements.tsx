import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  MessagePlugin,
  Dialog,
  Select,
} from 'tdesign-react';
import { BrowseIcon, CheckCircleIcon, TimeIcon } from 'tdesign-icons-react';
import { getAnnouncements, Announcement } from '../../api/announcements';
import { getElectionFiefs, ElectionFief } from '../../api/elections';
import { useAuthStore } from '../../stores/useAuthStore';
import { useElectionStore } from '../../stores/useElectionStore';
import { StatusTag } from '../../components/StatusTag';
import { LegalDocViewer } from '../../components/LegalDocViewer';
import { ElectionSessionList } from '../../components/ElectionSessionList';
import { SessionDetailBar } from '../../components/ElectionSessionList/SessionDetailBar';

export default function AnnouncementsPage() {
  const [list, setList] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [fiefs, setFiefs] = useState<ElectionFief[]>([]);
  const [selectedFiefId, setSelectedFiefId] = useState<string>('');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [currentAnn, setCurrentAnn] = useState<Announcement | null>(null);

  // 选届穿透状态：null 为第一级活动列表，有值则进入该届公告列表
  const [currentFief, setCurrentFief] = useState<ElectionFief | null>(null);

  const { user } = useAuthStore();
  const currentFiefId = useElectionStore((s) => s.currentFiefId);

  // 初始化加载活动
  useEffect(() => {
    getElectionFiefs().then((data) => {
      setFiefs(data);
      if (data.length > 0) {
        const target = currentFiefId || data[0].id;
        setSelectedFiefId(target);
      }
    });
  }, [currentFiefId]);

  // 加载该活动的公文记录
  const loadData = async () => {
    if (!selectedFiefId) return;
    setLoading(true);
    try {
      const data = await getAnnouncements({ electionFiefId: selectedFiefId });
      setList(data);
    } catch (err: any) {
      MessagePlugin.error(err.message || '加载公告记录失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedFiefId]);

  const columns = [
    {
      colKey: 'idx',
      title: '序号',
      width: 80,
      cell: ({ rowIndex }: any) => rowIndex + 1,
    },
    {
      colKey: 'title',
      title: '公文名称 / 标题',
      width: 320,
      cell: ({ row }: any) => (
        <span style={{ fontWeight: 500, color: '#1d2129' }}>{row.title}</span>
      ),
    },
    {
      colKey: 'templateName',
      title: '对应法定模板',
      width: 180,
      cell: ({ row }: any) => <span style={{ color: '#86909c' }}>{row.templateName || '法定正文模板'}</span>,
    },
    {
      colKey: 'status',
      title: '发布状态（小编留痕）',
      width: 140,
      cell: ({ row }: any) => {
        const isPub = row.status === 'published';
        return (
          <Tag
            theme={isPub ? 'success' : 'default'}
            variant="light"
            icon={isPub ? <CheckCircleIcon /> : <TimeIcon />}
          >
            {isPub ? '已依法发布' : '草稿待发布'}
          </Tag>
        );
      },
    },
    {
      colKey: 'publishedAt',
      title: '发布时间戳',
      width: 180,
      cell: ({ row }: any) => (
        <span style={{ fontSize: 13, color: '#4e5969' }}>
          {row.publishedAt || '—'}
        </span>
      ),
    },
    {
      colKey: 'op',
      title: '操作',
      width: 140,
      cell: ({ row }: any) => (
        <Button
          theme="primary"
          variant="text"
          size="small"
          icon={<BrowseIcon />}
          onClick={() => {
            setCurrentAnn(row);
            setPreviewVisible(true);
          }}
        >
          查看公文全文
        </Button>
      ),
    },
  ];

  const publishedCount = list.filter((a) => a.status === 'published').length;

  // 第一级：若未选择具体届次，展示选举活动届次列表
  if (!currentFief) {
    return (
      <div style={{ padding: 24, background: '#FAF8F5', minHeight: '100%' }}>
        <ElectionSessionList
          title="公告通知管理"
          sub="【层级铁律】先选届：14 阶段公文草稿与正式公告按活动（届）全套归卷，进入具体届次后核验红头公文发文留痕。"
          data={fiefs}
          loading={loading}
          statLabel="已发/总公文"
          statOf={(f) => {
            return (
              <Tag theme="success" variant="light">
                法定16篇红头预置
              </Tag>
            );
          }}
          onEnter={async (f) => {
            setCurrentFief(f);
            setSelectedFiefId(f.id);
            setLoading(true);
            try {
              const data = await getAnnouncements({ electionFiefId: f.id });
              setList(data);
            } catch (err: any) {
              MessagePlugin.error(err.message || '加载公告记录失败');
            } finally {
              setLoading(false);
            }
          }}
          enterText="查看公告列表"
        />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, background: '#FAF8F5', minHeight: '100%' }}>
      {/* 第二级：顶部带返回与当前届状态条 */}
      <SessionDetailBar
        fief={currentFief}
        onBack={() => {
          setCurrentFief(null);
        }}
        extra={
          <Tag theme="success" variant="light">
            已发布 {publishedCount} / 共 {list.length} 篇
          </Tag>
        }
      />

      <Card
        title={`【${currentFief.name}】公告发文台账`}
        description="所有法定公告内容在【选举提案】通过瞬间全部自动生成。本页面为纯记录台账，用于审计核验小编是否按法定节点执行发文。"
      >
        <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
          <Tag theme="primary" variant="light" size="large">
            总公文数：{list.length} 篇
          </Tag>
          <Tag theme="success" variant="light" size="large">
            已发布：{publishedCount} 篇
          </Tag>
          <Tag theme="default" variant="light" size="large">
            待发布：{list.length - publishedCount} 篇
          </Tag>
        </div>

        <Table data={list} columns={columns} rowKey="id" loading={loading} />
      </Card>

      {/* 公文规范预览弹窗 */}
      <Dialog
        header="公文全文预览"
        visible={previewVisible}
        onClose={() => setPreviewVisible(false)}
        footer={<Button onClick={() => setPreviewVisible(false)}>关闭</Button>}
        width={820}
      >
        {currentAnn && (
          <LegalDocViewer
            announcement={currentAnn}
            orgName={user?.orgName || '演示单位'}
            orgType={user?.orgType || 'village'}
          />
        )}
      </Dialog>
    </div>
  );
}

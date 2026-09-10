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
import { CellText } from '../../components/CellText';
import { IconActions } from '../../components/IconActions';

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
      // 本页活动列表按创建时间倒序：最新创建的排最前（后端默认按 d_day 降序返回）
      const sortedFiefs = [...data].sort((a, b) =>
        String(b.createdAt || '').localeCompare(String(a.createdAt || '')),
      );
      setFiefs(sortedFiefs);
      if (sortedFiefs.length > 0) {
        const target = currentFiefId || sortedFiefs[0].id;
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

  // [REUSE] 列收口：文号(templateCode)是主键、公文名称自适应换行、状态/时间/图标查看，删除与标题重复的“对应法定模板”列
  const columns = [
    {
      colKey: 'templateCode',
      title: '文号',
      width: 92,
      cell: ({ row }: any) => (
        <span style={{ fontWeight: 600, color: 'var(--color-primary)', whiteSpace: 'nowrap' }}>
          {row.templateCode || '—'}
        </span>
      ),
    },
    {
      colKey: 'title',
      title: '公文名称',
      cell: ({ row }: any) => <CellText main={row.title} sub={row.templateName || undefined} />,
    },
    {
      colKey: 'status',
      title: '状态',
      width: 116,
      cell: ({ row }: any) => {
        const isPub = row.status === 'published';
        return (
          <Tag
            theme={isPub ? 'success' : 'default'}
            variant="light"
            icon={isPub ? <CheckCircleIcon /> : <TimeIcon />}
          >
            {isPub ? '已发布' : '待发布'}
          </Tag>
        );
      },
    },
    {
      colKey: 'publishedAt',
      title: '发布时间',
      width: 168,
      cell: ({ row }: any) => (
        <span style={{ fontSize: 13, color: 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>
          {row.publishedAt ? String(row.publishedAt).replace('T', ' ').slice(0, 16) : '—'}
        </span>
      ),
    },
    {
      colKey: 'op',
      title: '查看',
      width: 64,
      cell: ({ row }: any) => (
        <IconActions
          items={[
            {
              icon: <BrowseIcon />,
              title: '查看公文全文',
              onClick: () => {
                setCurrentAnn(row);
                setPreviewVisible(true);
              },
            },
          ]}
        />
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
          sub="【层级铁律】先选届：16 阶段公文草稿与正式公告按活动（届）全套归卷，进入具体届次后核验红头公文发文留痕。"
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
            orgName={user?.orgName || '本单位'}
            orgType={user?.orgType || 'village'}
          />
        )}
      </Dialog>
    </div>
  );
}

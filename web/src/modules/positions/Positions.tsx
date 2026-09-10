import React, { memo, useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Dialog,
  Descriptions,
  MessagePlugin,
} from 'tdesign-react';
import { BrowseIcon, UploadIcon, DownloadIcon } from 'tdesign-icons-react';
import { getPositions, uploadPositionFile, Position } from '../../api/positions';
import { getElectionFiefs, ElectionFief } from '../../api/elections';
import { useAuthStore } from '../../stores/useAuthStore';
import { useElectionStore } from '../../stores/useElectionStore';
import { PermGate } from '../../components/PermGate';
import { FileList } from '../../components/FileList';
import { getFileUrl } from '../../api/files';
import { ElectionSessionList } from '../../components/ElectionSessionList';
import { SessionDetailBar } from '../../components/ElectionSessionList/SessionDetailBar';
import { CellText } from '../../components/CellText';
import { IconActions } from '../../components/IconActions';
import { validateUploadFile, UPLOAD_ACCEPT } from '../../utils/upload';

export default memo(function PositionsPage() {
  const [list, setList] = useState<Position[]>([]);
  const [fiefs, setFiefs] = useState<ElectionFief[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentPos, setCurrentPos] = useState<Position | null>(null);
  const [uploading, setUploading] = useState(false);

  // 选届穿透状态：null 为第一级届次列表，有值则进入该届岗位列表
  const [currentFief, setCurrentFief] = useState<ElectionFief | null>(null);

  const { user } = useAuthStore();
  const currentFiefId = useElectionStore((s) => s.currentFiefId);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const fiefData = await getElectionFiefs();
      // 本页活动列表按创建时间倒序：最新创建的排最前（后端默认按 d_day 降序返回）
      const sortedFiefs = [...fiefData].sort((a, b) =>
        String(b.createdAt || '').localeCompare(String(a.createdAt || '')),
      );
      setFiefs(sortedFiefs);

      const targetFiefId = currentFiefId || (sortedFiefs[0]?.id ?? '');
      if (targetFiefId) {
        const data = await getPositions({ electionFiefId: targetFiefId });
        setList(data);
      } else {
        const data = await getPositions();
        setList(data);
      }
    } catch (err: any) {
      MessagePlugin.error(err.message || '加载岗位列表失败');
    } finally {
      setLoading(false);
    }
  }, [currentFiefId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 上传岗位招募或资格审查附件（先本地校验格式/大小）
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentPos || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    e.target.value = '';
    const check = validateUploadFile(file);
    if (!check.ok) {
      MessagePlugin.warning(check.message || '文件不符合上传要求');
      return;
    }
    setUploading(true);
    try {
      await uploadPositionFile(currentPos.id, file);
      MessagePlugin.success('样表附件已上传并归档');
      loadData();
      setDetailVisible(false);
    } catch (err: any) {
      MessagePlugin.error(err.message || '上传附件失败');
    } finally {
      setUploading(false);
    }
  };

  // 动态根据当前日期判断岗位报名真实状态
  const getPositionRealStatus = (pos: Position) => {
    const today = new Date().toISOString().slice(0, 10);
    if (pos.applicationStart && pos.applicationEnd) {
      if (today < pos.applicationStart) return { label: '未开放报名', theme: 'default' as const };
      if (today >= pos.applicationStart && today <= pos.applicationEnd) return { label: '报名进行中', theme: 'success' as const };
      return { label: '报名已截止', theme: 'warning' as const };
    }
    return { label: pos.status === 'open' ? '报名招募中' : '已截止', theme: 'primary' as const };
  };

  const columns = [
    {
      colKey: 'name',
      title: '岗位名称',
      width: 180,
      cell: ({ row }: any) => <strong style={{ fontSize: 15, color: '#1A1A1A' }}>{row.name}</strong>,
    },
    {
      colKey: 'electionMethod',
      title: '选举方式',
      width: 140,
      cell: ({ row }: any) => <Tag theme="primary" variant="light">{row.electionMethod || '全民直接选举'}</Tag>,
    },
    {
      colKey: 'quota',
      title: '拟选名额',
      width: 120,
      cell: ({ row }: any) => <Tag theme="warning" variant="light">{row.quota} 名</Tag>,
    },
    {
      colKey: 'applicationTime',
      title: '法定报名起止周期',
      minWidth: 180,
      cell: ({ row }: any) => (
        <CellText
          main={row.applicationStart ? `${row.applicationStart} 至 ${row.applicationEnd}` : '以法定公告为准'}
          sub="法定报名周期"
        />
      ),
    },
    {
      colKey: 'materialReviewTime',
      title: '材料审查周期',
      minWidth: 180,
      cell: ({ row }: any) => (
        <CellText
          main={row.materialReviewStart ? `${row.materialReviewStart} 至 ${row.materialReviewEnd}` : '以法定公告为准'}
          sub="材料资格审查窗口"
        />
      ),
    },
    {
      colKey: 'status',
      title: '当前状态',
      width: 120,
      cell: ({ row }: any) => {
        const meta = getPositionRealStatus(row);
        return <Tag theme={meta.theme} variant="light">{meta.label}</Tag>;
      },
    },
    {
      colKey: 'op',
      title: '操作',
      width: 80,
      cell: ({ row }: any) => (
        <IconActions
          items={[
            {
              icon: <BrowseIcon />,
              title: '岗位明细',
              onClick: () => {
                setCurrentPos(row);
                setDetailVisible(true);
              },
            },
          ]}
        />
      ),
    },
  ];

  // 第一级：若未选择具体届次，展示选举活动届次列表
  if (!currentFief) {
    return (
      <div style={{ padding: 24, background: '#FAF8F5', minHeight: '100%' }}>
        <ElectionSessionList
          title="岗位管理"
          sub="岗位按届次确定：先选择具体届次，即可查看各岗位职数配额、任职要求，并维护报名样表附件。"
          data={fiefs}
          loading={loading}
          statLabel="拟设岗位/名额"
          statOf={(f) => {
            const fiefPos = list.filter((p) => p.electionFiefId === f.id);
            const totalQuota = fiefPos.reduce((sum, p) => sum + (p.quota || 0), 0);
            return (
              <Tag theme="primary" variant="light">
                {fiefPos.length} 岗 / 共 {totalQuota} 名
              </Tag>
            );
          }}
          onEnter={async (f) => {
            setCurrentFief(f);
            setLoading(true);
            try {
              const data = await getPositions({ electionFiefId: f.id });
              setList(data);
            } catch (err: any) {
              MessagePlugin.error(err.message || '加载岗位列表失败');
            } finally {
              setLoading(false);
            }
          }}
          enterText="查看本届岗位"
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
          loadData();
        }}
        extra={
          <Tag theme="primary" variant="light">
            本届拟选总职数 {list.filter((p) => !currentFief || p.electionFiefId === currentFief.id).reduce((sum, p) => sum + (p.quota || 0), 0)} 名
          </Tag>
        }
      />

      <Card
        bordered
        title={`【${currentFief.name}】换届选举岗位审计表`}
        description="岗位职数配额由提案审批通过后确定，法定报名与初审周期依 D 日倒排（D-15 至 D-13）；本页信息同步供小程序端参选人查阅。"
      >
        <Table
          data={list.filter((p) => !currentFief || p.electionFiefId === currentFief.id)}
          columns={columns}
          rowKey="id"
          loading={loading}
          bordered
          hover
          stripe
        />
      </Card>

      {/* 岗位明细 Dialog */}
      <Dialog
        header={`本届【${currentPos?.name || ''}】岗位规格与招募资料`}
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        footer={<Button onClick={() => setDetailVisible(false)}>关闭</Button>}
        width={720}
      >
        {currentPos && (
          <div>
            <Descriptions
              bordered
              size="small"
              column={2}
              items={[
                { label: '岗位名称', content: <strong>{currentPos.name}</strong> },
                { label: '选举方式', content: <Tag theme="primary" variant="light">{currentPos.electionMethod || '全民直接选举'}</Tag> },
                { label: '拟选名额职数', content: `${currentPos.quota} 名` },
                { label: '报名起止周期', content: `${currentPos.applicationStart || '—'} 至 ${currentPos.applicationEnd || '—'}` },
                { label: '资格审核周期', content: `${currentPos.materialReviewStart || '—'} 至 ${currentPos.materialReviewEnd || '—'}` },
                { label: '任职资格与法定条件', content: currentPos.requirement || '按照《中华人民共和国村民委员会组织法》《中华人民共和国城市居民委员会组织法》及换届政策规定执行', span: 2 },
              ]}
            />

            <h4 style={{ margin: '18px 0 10px', color: '#1A1A1A' }}>招募文件与参选样表附件（直通小程序下载）</h4>
            <div style={{ marginBottom: 16 }}>
              {(!currentPos.files || currentPos.files.length === 0) ? (
                <div style={{ color: '#999', padding: '12px 0' }}>暂未上传岗位专属样表附件</div>
              ) : (
                <FileList
                  files={currentPos.files.map((f) => ({
                    id: f.id,
                    fileName: f.fileName,
                    storageKey: f.storageKey,
                    sizeBytes: f.sizeBytes,
                  }))}
                />
              )}
            </div>

            <PermGate perm="position:manage" roles={['platform_admin', 'sub_admin', 'editor']}>
              <div style={{ marginTop: 16, padding: '12px 16px', background: '#F5F3F0', borderRadius: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#1A1A1A' }}>
                  补充上传本岗位资格审查样表 / 政策问答文件
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="file"
                    accept={UPLOAD_ACCEPT}
                    id="pos-file-upload-input"
                    style={{ display: 'none' }}
                    onChange={handleUploadFile}
                    disabled={uploading}
                  />
                  <Button
                    size="small"
                    variant="outline"
                    loading={uploading}
                    icon={<UploadIcon />}
                    onClick={() => document.getElementById('pos-file-upload-input')?.click()}
                  >
                    选择文件上传
                  </Button>
                  <span style={{ fontSize: 12, color: '#7A7A7A' }}>
                    支持 PDF、Word、Excel 及图片格式，上传后自动入库并在小程序端实时可见。
                  </span>
                </div>
              </div>
            </PermGate>
          </div>
        )}
      </Dialog>
    </div>
  );
});

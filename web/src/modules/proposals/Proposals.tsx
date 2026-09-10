import React, { memo, useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
  Card,
  Table,
  Button,
  Dialog,
  Form,
  Input,
  DatePicker,
  Select,
  InputNumber,
  Space,
  Tag,
  Divider,
  Descriptions,
  MessagePlugin,
  Row,
  Col,
} from 'tdesign-react';
import {
  AddIcon,
  DeleteIcon,
  SearchIcon,
  RefreshIcon,
  BrowseIcon,
  CheckCircleIcon,
  CloseCircleIcon,
  UploadIcon,
} from 'tdesign-icons-react';
import {
  getProposals,
  createProposal,
  updateProposal,
  reviewProposal,
  uploadProposalFile,
  deleteProposalFile,
  Proposal,
  PositionInput,
} from '../../api/proposals';
import { uploadFile } from '../../api/files';
import { useAuthStore } from '../../stores/useAuthStore';
import { GuideTip } from '../../components/GuideTip';
import { PermGate } from '../../components/PermGate';
import { FileList } from '../../components/FileList';
import { validateUploadFile, UPLOAD_ACCEPT } from '../../utils/upload';

const { FormItem } = Form;

const STATUS_MAP = {
  draft: { label: '草稿', theme: 'default' as const },
  pending: { label: '待审批', theme: 'warning' as const },
  approved: { label: '已通过', theme: 'success' as const },
  rejected: { label: '已驳回', theme: 'danger' as const },
};

export default memo(function ProposalsPage() {
  const [list, setList] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 筛选工具栏状态
  const [filterKeyword, setFilterKeyword] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterMode, setFilterMode] = useState<string>('');

  // 弹窗状态
  const [createVisible, setCreateVisible] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [reviewVisible, setReviewVisible] = useState(false);
  const [currentProposal, setCurrentProposal] = useState<Proposal | null>(null);

  // 审核表单
  const [reviewDecision, setReviewDecision] = useState<'approved' | 'rejected'>('approved');
  const [reviewNote, setReviewNote] = useState('');

  // 创建/编辑提案表单状态
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [dDay, setDDay] = useState('');
  const [electionMode, setElectionMode] = useState('全民直选');
  const [description, setDescription] = useState('');
  const [positions, setPositions] = useState<PositionInput[]>([
    { name: '主任', quota: 1, requirement: '年满十八周岁，具有选民资格，遵纪守法，品行端正', electionMethod: '全民直接选举' },
    { name: '副主任', quota: 1, requirement: '热心农村/社区公益事业，廉洁奉公，具有组织协调能力', electionMethod: '全民直接选举' },
    { name: '委员', quota: 4, requirement: '公道正派，身体健康，能正常履行工作职责', electionMethod: '全民直接选举' },
  ]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [positionFiles, setPositionFiles] = useState<{ [index: number]: File }>({});
  const posFileInputs = useRef<{ [index: number]: HTMLInputElement | null }>({});
  const schemeFileInputRef = useRef<HTMLInputElement>(null);
  const detailUploadInputRef = useRef<HTMLInputElement>(null);
  const [detailUploading, setDetailUploading] = useState(false);

  const { user } = useAuthStore();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getProposals();
      setList(data);
    } catch (err: any) {
      MessagePlugin.error(err.message || '加载换届提案列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 打开创建提案弹窗 (支持从驳回重编)
  const openCreateModal = (row?: Proposal) => {
    if (row) {
      // 重新编辑被驳回提案
      setEditingId(row.id);
      setTitle(row.name);
      setDDay(row.dDay || '');
      setPositions(
        row.positions && row.positions.length
          ? row.positions.map((p) => ({
              ...p,
              electionMethod: p.electionMethod || '全民直接选举',
            }))
          : [
              { name: '主任', quota: 1, requirement: '年满十八周岁，具有选民资格', electionMethod: '全民直接选举' },
              { name: '委员', quota: 4, requirement: '遵纪守法，品行端正', electionMethod: '全民直接选举' },
            ],
      );
      setSelectedFile(null);
      setPositionFiles({});
    } else {
      // 全新创建
      setEditingId(null);
      const isCommunity = user?.orgType === 'community';
      setTitle(`${user?.orgName || '本村'}${new Date().getFullYear()}年换届选举工作方案提案`);
      setDDay('');
      setElectionMode('全民直选');
      setDescription('');
      setPositions(
        isCommunity
          ? [
              { name: '居委会主任', quota: 1, requirement: '年满十八周岁，具有居民代表选举资格', electionMethod: '全民直接选举' },
              { name: '居委会副主任', quota: 1, requirement: '热心社区公益事业，遵纪守法', electionMethod: '全民直接选举' },
              { name: '居委会委员', quota: 5, requirement: '热心社区服务，品行良好，身体健康', electionMethod: '全民直接选举' },
            ]
          : [
              { name: '村委会主任', quota: 1, requirement: '年满十八周岁，具有选民资格，遵纪守法', electionMethod: '全民直接选举' },
              { name: '村委会副主任', quota: 1, requirement: '热心农村公益事业，公道正派', electionMethod: '全民直接选举' },
              { name: '村委会委员', quota: 3, requirement: '遵纪守法，品行端正，廉洁奉公', electionMethod: '全民直接选举' },
            ],
      );
      setSelectedFile(null);
      setPositionFiles({});
    }
    setCreateVisible(true);
  };

  // 岗位行操作
  const addPositionRow = () => {
    setPositions([...positions, { name: '委员', quota: 1, requirement: '遵纪守法，品行良好', electionMethod: '全民直接选举' }]);
  };

  const removePositionRow = (idx: number) => {
    if (positions.length <= 1) {
      MessagePlugin.warning('换届提案至少须设置 1 个岗位');
      return;
    }
    setPositions(positions.filter((_, i) => i !== idx));
  };

  const updatePosition = (idx: number, field: keyof PositionInput, value: any) => {
    const next = [...positions];
    next[idx] = { ...next[idx], [field]: value };
    setPositions(next);
  };

  // 提交提案
  const handleSubmit = async () => {
    if (!title.trim() || !dDay) {
      MessagePlugin.warning('请完整填写提案名称并指定正式选举日 (D-day)');
      return;
    }
    for (const p of positions) {
      if (!p.name.trim()) {
        MessagePlugin.warning('所有岗位名称均不能为空');
        return;
      }
    }

    setSubmitting(true);
    try {
      // 归属机构兜底强校验（双重提取：user.organizationId 或 user.orgId）
      const effectiveOrgId = user?.organizationId || user?.orgId || localStorage.getItem('cxq_org_id');
      if (!effectiveOrgId) {
        MessagePlugin.error('缺少组织归属地上下文，请重新登录选定归属村居后再发起提案');
        setSubmitting(false);
        return;
      }

      // 若某个岗位上传了样表附件，先统一走 /files/upload 物理落盘取得 storageKey
      const enrichedPositions = [...positions];
      for (let i = 0; i < enrichedPositions.length; i++) {
        const pFile = positionFiles[i];
        if (pFile) {
          try {
            const uploadedMeta = await uploadFile(pFile);
            enrichedPositions[i] = {
              ...enrichedPositions[i],
              sampleFileName: pFile.name,
              sampleStorageKey: uploadedMeta.storageKey,
              sampleSizeBytes: uploadedMeta.sizeBytes,
              sampleMimeType: uploadedMeta.mimeType,
            };
          } catch (e: any) {
            // [FIXED 2026-09-10] 样表上传失败不再静默丢弃：明确提示用户重试
            MessagePlugin.warning(`岗位「${enrichedPositions[i].name}」样表上传失败，请重新选择该附件后再提交`);
            return;
          }
        }
      }

      let savedProposalId = editingId;
      if (editingId) {
        await updateProposal(editingId, {
          name: title.trim(),
          dDay,
          positions: enrichedPositions,
        });
      } else {
        const created = await createProposal({
          organizationId: effectiveOrgId,
          name: title.trim(),
          dDay,
          orgType: user?.orgType || 'village',
          positions: enrichedPositions,
        });
        savedProposalId = created?.id;
      }

      if (selectedFile && savedProposalId) {
        await uploadProposalFile(savedProposalId, selectedFile);
      }

      MessagePlugin.success(editingId ? '提案已修订重新提交送审！' : '换届选举提案发起成功，等待审核批复！');
      setCreateVisible(false);
      loadData();
    } catch (err: any) {
      MessagePlugin.error(err.message || '提交提案失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 执行审批批复
  const handleReviewSubmit = async () => {
    if (!currentProposal) return;
    if (reviewDecision === 'rejected' && !reviewNote.trim()) {
      MessagePlugin.warning('请填写明确的驳回原因与修改意见，便于发起人针对性补正');
      return;
    }
    setSubmitting(true);
    try {
      await reviewProposal(currentProposal.id, reviewDecision, reviewNote.trim());
      if (reviewDecision === 'approved') {
        MessagePlugin.success('提案审批通过：法定阶段日程、岗位与预排公文已自动生成');
        // 审批通过后，引导用户前往活动列表查看
        setTimeout(() => {
          MessagePlugin.info('下一步：请前往「换届活动」进入当届活动，推进日程并发布公文。', 6000);
        }, 1200);
      } else {
        MessagePlugin.warning('提案已驳回，发起人可重新修改后提交');
      }
      setReviewVisible(false);
      setDetailVisible(false);
      loadData();
    } catch (err: any) {
      MessagePlugin.error(err.message || '批复处理失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 客户端筛选逻辑
  const filteredList = useMemo(() => {
    return list.filter((p) => {
      if (filterKeyword && !p.name.includes(filterKeyword.trim())) return false;
      if (filterStatus && p.status !== filterStatus) return false;
      return true;
    });
  }, [list, filterKeyword, filterStatus]);

  const columns = [
    {
      colKey: 'createdAt',
      title: '提交时间',
      width: 140,
      cell: ({ row }: any) => String(row.createdAt || '').slice(0, 10),
    },
    {
      colKey: 'name',
      title: '提案名称',
      minWidth: 260,
      cell: ({ row }: any) => (
        <span style={{ fontWeight: 600, color: '#1A1A1A' }}>{row.name}</span>
      ),
    },
    {
      colKey: 'orgType',
      title: '归属性质',
      width: 120,
      cell: ({ row }: any) => (
        <Tag theme={row.orgType === 'community' ? 'warning' : 'primary'} variant="light">
          {row.orgType === 'community' ? '城市社区' : '农村行政村'}
        </Tag>
      ),
    },
    {
      colKey: 'dDay',
      title: 'D-Day 正式选举日',
      width: 160,
      cell: ({ row }: any) => (
        <span style={{ color: '#B22222', fontWeight: 700, fontFamily: 'sans-serif' }}>
          {row.dDay || '待定'}
        </span>
      ),
    },
    {
      colKey: 'status',
      title: '状态',
      width: 110,
      cell: ({ row }: any) => {
        const meta = STATUS_MAP[row.status as keyof typeof STATUS_MAP] || { label: row.status, theme: 'default' };
        const tipContent = row.status === 'approved'
          ? '提案已通过 ✅ 全套阶段日程、各岗位及公文模板已自动生成。去「选举活动管理」查看活动详情并推进各阶段工作。'
          : row.status === 'pending'
          ? '提案等待审批中。审批通过后系统将自动生成全套选举日程。'
          : row.status === 'rejected'
          ? '提案未通过，请根据驳回意见修改后重新提交。'
          : '草稿状态，尚未提交审批。';
        return (
          <GuideTip content={tipContent} placement="top">
            <Tag theme={meta.theme} variant="light">{meta.label}</Tag>
          </GuideTip>
        );
      },
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
            onClick={() => {
              setCurrentProposal(row);
              setDetailVisible(true);
            }}
          >
            查看详情
          </Button>

          {/* 驳回状态允许发起人重新编辑 */}
          {row.status === 'rejected' && (
            <Button
              theme="warning"
              variant="text"
              size="small"
              onClick={() => openCreateModal(row)}
            >
              重新编辑
            </Button>
          )}

          {/* 待审批状态且具备审批权限允许批复 */}
          {row.status === 'pending' && (
            <PermGate perm="proposal:review" roles={['platform_admin', 'sub_admin', 'reviewer']}>
              <Button
                theme="primary"
                variant="text"
                size="small"
                onClick={() => {
                  setCurrentProposal(row);
                  setReviewDecision('approved');
                  setReviewNote('');
                  setReviewVisible(true);
                }}
              >
                批复审核
              </Button>
            </PermGate>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, background: '#FAF8F5', minHeight: '100%' }}>
      <Card bordered title="换届选举提案管理">
        {/* 筛选与操作工具栏 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <Space>
            <Input
              style={{ width: 220 }}
              placeholder="搜索提案名称..."
              value={filterKeyword}
              onChange={setFilterKeyword}
              clearable
            />
            <Select
              style={{ width: 140 }}
              placeholder="提案状态"
              value={filterStatus}
              onChange={(v: any) => setFilterStatus(v)}
              clearable
              options={[
                { label: '全部状态', value: '' },
                { label: '待审批', value: 'pending' },
                { label: '已通过', value: 'approved' },
                { label: '已驳回', value: 'rejected' },
              ]}
            />
            <Button theme="default" variant="base" icon={<RefreshIcon />} onClick={loadData}>
              刷新
            </Button>
          </Space>

          <PermGate perm="proposal:create" roles={['platform_admin', 'sub_admin', 'editor']}>
            <GuideTip
              title="第一步：发起换届提案"
              content="设定换届正式选举日 (D-day)、选举方式及各岗位职数方案，提交审批。审批通过后系统将全自动生成 16 阶段法定日程与预排公文！"
              placement="left"
            >
              <Button theme="primary" icon={<AddIcon />} onClick={() => openCreateModal()}>
                创建提案
              </Button>
            </GuideTip>
          </PermGate>
        </div>

        {/* 列表表格 */}
        <Table
          data={filteredList}
          columns={columns}
          rowKey="id"
          loading={loading}
          bordered
          hover
          stripe
        />
      </Card>

      {/* 820px 发起/编辑换届提案 Dialog */}
      <Dialog
        header={editingId ? '修订换届选举工作提案' : '发起村居换届选举提案'}
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        confirmBtn={{ content: '提交提案送审', theme: 'primary', loading: submitting }}
        onConfirm={handleSubmit}
        width={820}
      >
        <div style={{ maxHeight: 580, overflowY: 'auto', paddingRight: 8 }}>
          <Form labelWidth={150}>
            <FormItem label="归属机构">
              <Input
                value={`${user?.orgType === 'community' ? '城市社区居委会' : '农村村民委员会'} · ${user?.orgName || '本单位'}`}
                disabled
              />
            </FormItem>

            <FormItem label="提案名称" requiredMark>
              <Input
                value={title}
                onChange={setTitle}
                placeholder="例如：XX社区2026年居民委员会换届选举提案"
              />
            </FormItem>

            <FormItem label="法定选举日 (D-day)" requiredMark>
              <DatePicker
                value={dDay}
                valueType="YYYY-MM-DD"
                onChange={(v: any) => setDDay(typeof v === 'string' ? v : '')}
                placeholder="请指定正式选举投票日 (D-day)"
                style={{ width: '100%' }}
              />
              <div style={{ color: '#B22222', fontSize: 12, marginTop: 4 }}>
                * 法定选举日（D 日）是全部日程的基准：提案审核通过后，16 个法定阶段、报名期限与联审日程均由该日期依法倒排自动生成。
              </div>
            </FormItem>

            <Divider align="left">本届拟设换届岗位及职数配置（选举方式下沉到岗位级 · 专属样表归档）</Divider>
            <div style={{ marginBottom: 16 }}>
              {positions.map((pos, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    marginBottom: 12,
                    background: '#FAF8F5',
                    padding: '12px 14px',
                    borderRadius: 6,
                    border: '1px solid #E8E5E0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Input
                      style={{ width: 140 }}
                      value={pos.name}
                      placeholder="岗位名称 (如主任)"
                      onChange={(v) => updatePosition(idx, 'name', v)}
                    />
                    <Select
                      style={{ width: 160 }}
                      value={pos.electionMethod || '全民直接选举'}
                      onChange={(v: any) => updatePosition(idx, 'electionMethod', v)}
                      options={[
                        { label: '全民直接选举', value: '全民直接选举' },
                        { label: '户代表选举', value: '户代表选举' },
                        { label: '代表会议选举', value: '代表会议选举' },
                      ]}
                    />
                    <InputNumber
                      style={{ width: 100 }}
                      value={pos.quota}
                      min={1}
                      max={20}
                      onChange={(v) => updatePosition(idx, 'quota', Number(v))}
                    />
                    <span style={{ fontSize: 12, color: '#7A7A7A' }}>名</span>
                    <Input
                      style={{ flex: 1 }}
                      value={pos.requirement}
                      placeholder="法定任职资格与条件（政治素质、履职能力、年龄学历等）"
                      onChange={(v) => updatePosition(idx, 'requirement', v)}
                    />
                    <Button
                      theme="danger"
                      variant="text"
                      shape="circle"
                      icon={<DeleteIcon />}
                      onClick={() => removePositionRow(idx)}
                    />
                  </div>

                  {/* 岗位专属资格表 / 样表附件上传（供参选人下载） */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#666', background: '#FFF', padding: '6px 12px', borderRadius: 4, border: '1px dashed #DCDCDC' }}>
                    <span>岗位参选资格样表 / 问答附件：</span>
                    <input
                      ref={(el) => (posFileInputs.current[idx] = el)}
                      type="file"
                      accept={UPLOAD_ACCEPT}
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          const file = e.target.files[0];
                          const check = validateUploadFile(file);
                          if (!check.ok) { MessagePlugin.warning(check.message || '文件不符合上传要求'); return; }
                          setPositionFiles(prev => ({ ...prev, [idx]: file }));
                          updatePosition(idx, 'sampleFileName', file.name);
                        }
                      }}
                    />
                    <Button
                      size="small"
                      variant="outline"
                      icon={<UploadIcon />}
                      onClick={() => posFileInputs.current[idx]?.click()}
                    >
                      选择文件
                    </Button>
                    {positionFiles[idx] ? (
                      <Tag theme="success" variant="light">已就绪：{positionFiles[idx].name}</Tag>
                    ) : (
                      <span style={{ color: '#999' }}>选填，审批通过后自动关联至该岗位</span>
                    )}
                  </div>
                </div>
              ))}
              <Button theme="default" variant="dashed" block icon={<AddIcon />} onClick={addPositionRow}>
                ＋ 增加拟设选举岗位
              </Button>
            </div>

            <Divider align="left">选举实施方案及红头盖章附件</Divider>
            <FormItem label="工作方案/样表附件">
              <input
                ref={schemeFileInputRef}
                type="file"
                accept={UPLOAD_ACCEPT}
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    const file = e.target.files[0];
                    const check = validateUploadFile(file);
                    if (!check.ok) { MessagePlugin.warning(check.message || '文件不符合上传要求'); return; }
                    setSelectedFile(file);
                  }
                }}
              />
              <Space align="center">
                <Button
                  size="small"
                  variant="outline"
                  icon={<UploadIcon />}
                  onClick={() => schemeFileInputRef.current?.click()}
                >
                  选择文件
                </Button>
                {selectedFile ? (
                  <Tag theme="success" variant="light">已选择：{selectedFile.name}</Tag>
                ) : (
                  <span style={{ color: '#999', fontSize: 12 }}>未选择文件（支持 PDF / Word / 扫描件）</span>
                )}
              </Space>
              <div style={{ color: '#7A7A7A', fontSize: 12, marginTop: 4 }}>
                支持上传由上级或选委会盖章的工作筹备方案扫描件、空白报名表单模板等附件（通过后自动归档并供小程序端参选人下载）。
              </div>
            </FormItem>
          </Form>
        </div>
      </Dialog>

      {/* 提案详情 Descriptions Dialog */}
      <Dialog
        header="选举提案详细规格信息"
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        footer={
          <Space>
            {currentProposal?.status === 'pending' && (
              <PermGate perm="proposal:review" roles={['platform_admin', 'sub_admin', 'reviewer']}>
                <Button
                  theme="primary"
                  onClick={() => {
                    setReviewDecision('approved');
                    setReviewNote('');
                    setReviewVisible(true);
                  }}
                >
                  前往批复
                </Button>
              </PermGate>
            )}
            <Button onClick={() => setDetailVisible(false)}>关闭</Button>
          </Space>
        }
        width={760}
      >
        {currentProposal && (
          <div>
            <Descriptions
              title="提案基础信息"
              bordered
              size="small"
              column={2}
              items={[
                { label: '提案名称', content: currentProposal.name, span: 2 },
                { label: '正式选举日 (D-day)', content: <strong style={{ color: '#B22222' }}>{currentProposal.dDay}</strong> },
                { label: '归属村居性质', content: currentProposal.orgType === 'community' ? '城市社区' : '农村行政村' },
                { label: '提交时间', content: currentProposal.createdAt },
                {
                  label: '审核状态',
                  content: (
                    <Tag
                      theme={STATUS_MAP[currentProposal.status as keyof typeof STATUS_MAP]?.theme || 'default'}
                      variant="light"
                    >
                      {STATUS_MAP[currentProposal.status as keyof typeof STATUS_MAP]?.label || currentProposal.status}
                    </Tag>
                  ),
                },
                ...(currentProposal.rejectReason
                  ? [
                      {
                        label: '驳回原因及补正要求',
                        content: (
                          <span style={{ color: '#D54941', fontWeight: 600 }}>
                            驳回理由：{currentProposal.rejectReason}
                          </span>
                        ),
                        span: 2,
                      },
                    ]
                  : []),
              ]}
            />

            <h4 style={{ margin: '16px 0 8px', color: '#1A1A1A' }}>拟选岗位配置清单（含选举方式与资格要求）</h4>
            <Table
              data={currentProposal.positions || []}
              columns={[
                { colKey: 'name', title: '岗位名称', width: 140 },
                { colKey: 'electionMethod', title: '选举方式', width: 150, cell: ({ row }: any) => <Tag theme="primary" variant="light">{row.electionMethod || '全民直接选举'}</Tag> },
                { colKey: 'quota', title: '名额职数', width: 100, cell: ({ row }: any) => `${row.quota} 名` },
                { colKey: 'requirement', title: '任职资格与法定条件' },
              ]}
              rowKey="name"
              size="small"
              bordered
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '20px 0 8px' }}>
              <h4 style={{ margin: 0, color: '#1A1A1A' }}>方案红头附件及盖章扫描件</h4>
              {/* 允许有创建/编辑权限者直接在详情中补充上传公文方案扫描件 */}
              <PermGate perm="proposal:create" roles={['platform_admin', 'sub_admin', 'editor']}>
                <div>
                  <input
                    ref={detailUploadInputRef}
                    type="file"
                    accept={UPLOAD_ACCEPT}
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !currentProposal) return;
                      const check = validateUploadFile(file);
                      if (!check.ok) { MessagePlugin.warning(check.message || '文件不符合上传要求'); return; }
                      setDetailUploading(true);
                      try {
                        await uploadProposalFile(currentProposal.id, file);
                        MessagePlugin.success(`附件「${file.name}」补充上传成功`);
                        // 刷新提案列表与当前详情视图
                        const updatedList = await getProposals();
                        setList(updatedList);
                        const refreshed = updatedList.find(item => item.id === currentProposal.id);
                        if (refreshed) setCurrentProposal(refreshed);
                      } catch (err: any) {
                        MessagePlugin.error(err.message || '上传附件失败');
                      } finally {
                        setDetailUploading(false);
                        if (detailUploadInputRef.current) detailUploadInputRef.current.value = '';
                      }
                    }}
                  />
                  <Button
                    size="small"
                    variant="outline"
                    theme="primary"
                    icon={<UploadIcon />}
                    loading={detailUploading}
                    onClick={() => detailUploadInputRef.current?.click()}
                  >
                    补充上传附件
                  </Button>
                </div>
              </PermGate>
            </div>
            <FileList
              files={currentProposal.files || []}
              onDelete={async (file) => {
                if (!currentProposal) return;
                try {
                  await deleteProposalFile(currentProposal.id, file.id);
                  MessagePlugin.success(`已移除附件「${file.fileName}」`);
                  const updatedList = await getProposals();
                  setList(updatedList);
                  const refreshed = updatedList.find(item => item.id === currentProposal.id);
                  if (refreshed) setCurrentProposal(refreshed);
                } catch (err: any) {
                  MessagePlugin.error(err.message || '删除附件失败');
                }
              }}
            />
          </div>
        )}
      </Dialog>

      {/* 批复审核 Dialog */}
      <Dialog
        header="换届选举提案审查批复"
        visible={reviewVisible}
        onClose={() => setReviewVisible(false)}
        confirmBtn={{ content: '确认提交批复', theme: 'primary', loading: submitting }}
        onConfirm={handleReviewSubmit}
        width={560}
      >
        <Form labelWidth={120}>
          <FormItem label="审查结论" requiredMark>
            <Space>
              <Button
                theme={reviewDecision === 'approved' ? 'success' : 'default'}
                variant={reviewDecision === 'approved' ? 'base' : 'outline'}
                icon={<CheckCircleIcon />}
                onClick={() => setReviewDecision('approved')}
              >
                批准通过
              </Button>
              <Button
                theme={reviewDecision === 'rejected' ? 'danger' : 'default'}
                variant={reviewDecision === 'rejected' ? 'base' : 'outline'}
                icon={<CloseCircleIcon />}
                onClick={() => setReviewDecision('rejected')}
              >
                驳回补正
              </Button>
            </Space>
          </FormItem>

          <FormItem label="批复意见/理由" requiredMark={reviewDecision === 'rejected'}>
            <Input
              value={reviewNote}
              onChange={setReviewNote}
              placeholder={reviewDecision === 'approved' ? '可输入批复文号或意见（选填）' : '请明确告知驳回原因与补正要求（必填）'}
            />
          </FormItem>

          {reviewDecision === 'approved' && (
            <div style={{ padding: '10px 14px', background: '#E8F5ED', borderRadius: 6, fontSize: 12, color: '#2D8B55' }}>
              <strong>流程联动说明</strong>：审查通过后，系统将自动生成当届换届活动、16 阶段法定倒排日程、各岗位及配套法定公文草稿。
            </div>
          )}
        </Form>
      </Dialog>
    </div>
  );
});

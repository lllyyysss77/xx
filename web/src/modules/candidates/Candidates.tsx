import React, { memo, useMemo, useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Steps,
  Dialog,
  Form,
  Input,
  Select,
  Radio,
  Descriptions,
  MessagePlugin,
  Divider,
} from 'tdesign-react';
import {
  UserIcon,
  SearchIcon,
  RefreshIcon,
  CheckCircleIcon,
  CloseCircleIcon,
  TimeIcon,
  EditIcon,
  BrowseIcon,
  DownloadIcon,
} from 'tdesign-icons-react';
import {
  getCandidates,
  addCandidateReview,
  exportCandidateDossier,
  Candidate,
  CandidateReview,
} from '../../api/candidates';
import { getElectionFiefs, ElectionFief } from '../../api/elections';
import { useAuthStore } from '../../stores/useAuthStore';
import { useElectionStore } from '../../stores/useElectionStore';
import { GuideTip } from '../../components/GuideTip';
import { PermGate } from '../../components/PermGate';
import { getFileUrl, formatFileSize } from '../../api/files';
import { ElectionSessionList } from '../../components/ElectionSessionList';
import { SessionDetailBar } from '../../components/ElectionSessionList/SessionDetailBar';

const { StepItem } = Steps;
const { FormItem } = Form;

// 四轮联审规范定义（严格映射甲方 DOCX）
const ROUND_CONFIG: Record<string, { name: string; dept: string; short: string }> = {
  R1: { name: '第一轮 · 乡镇/街道资格初审', dept: '乡镇指导组 / 街道工作专班', short: 'R1初审' },
  R2: { name: '第二轮 · 竞选预选/差额筛选', dept: '村民代表大会 / 居民代表会议', short: 'R2预选' },
  R3: { name: '第三轮 · 区级11部门资格联审', dept: '纪委监委、公安、法院、民政等11个部门', short: 'R3联审' },
  R4: { name: '第四轮 · 党委/党工委考察确定', dept: '乡镇党委 / 街道党工委', short: 'R4考察' },
};

const ROUND_META = {
  approved: { theme: 'success' as const, label: '通过' },
  rejected: { theme: 'danger' as const, label: '淘汰' },
  reviewing: { theme: 'warning' as const, label: '待审' },
};

export default memo(function CandidatesPage() {
  const [list, setList] = useState<Candidate[]>([]);
  const [fiefs, setFiefs] = useState<ElectionFief[]>([]);
  const [selectedFiefId, setSelectedFiefId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 选届穿透状态：null 表示在第一级「活动列表」，有值则进入该届四轮联审明细
  const [currentFief, setCurrentFief] = useState<ElectionFief | null>(null);

  // 筛选
  const [keyword, setKeyword] = useState('');
  const [roundFilter, setRoundFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // 弹窗状态
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentCandidate, setCurrentCandidate] = useState<Candidate | null>(null);

  // 录入线下审查结果弹窗
  const [reviewVisible, setReviewVisible] = useState(false);
  const [selectedRound, setSelectedRound] = useState<'R1' | 'R2' | 'R3' | 'R4'>('R1');
  const [decision, setDecision] = useState<'approved' | 'rejected'>('approved');
  const [reviewNote, setReviewNote] = useState('');

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

      const targetFiefId = selectedFiefId || currentFiefId || (sortedFiefs[0]?.id ?? '');
      if (targetFiefId) {
        setSelectedFiefId(targetFiefId);
        const data = await getCandidates({ electionFiefId: targetFiefId });
        setList(data);
      } else {
        const data = await getCandidates();
        setList(data);
      }
    } catch (err: any) {
      MessagePlugin.error(err.message || '加载候选人池失败');
    } finally {
      setLoading(false);
    }
  }, [selectedFiefId, currentFiefId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 打开录入结果弹窗
  const openReviewModal = (cand: Candidate) => {
    setCurrentCandidate(cand);
    const cr = cand.currentRound === 'complete' ? 'R4' : cand.currentRound;
    setSelectedRound((cr || 'R1') as any);
    setDecision('approved');
    setReviewNote('');
    setReviewVisible(true);
  };

  // 提交录入
  const handleReviewSubmit = async () => {
    if (!currentCandidate) return;
    setSubmitting(true);
    try {
      await addCandidateReview(currentCandidate.id, {
        round: selectedRound,
        decision,
        note: reviewNote.trim() || undefined,
      });

      MessagePlugin.success(`线下联审【${selectedRound}】结果已成功线上回填留痕！`);
      setReviewVisible(false);
      setDetailVisible(false);
      loadData();
    } catch (err: any) {
      MessagePlugin.error(err.message || '录入联审结果失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 计算候选人四轮步骤进度 (0 ~ 4)
  const getRoundStepIndex = (c: Candidate) => {
    if (c.status === 'rejected') return -1;
    if (c.currentRound === 'R1') return 0;
    if (c.currentRound === 'R2') return 1;
    if (c.currentRound === 'R3') return 2;
    if (c.currentRound === 'R4') return 3;
    if (c.currentRound === 'complete') return 4;
    return 0;
  };

  // 导出候选人资格审查全卷 JSON/档案
  const handleExportDossier = async (c: Candidate) => {
    try {
      MessagePlugin.loading('正在提取全卷数据并生成归档...');
      const data = await exportCandidateDossier(c.id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `【候选人全卷】${c.candidateName || '候选人'}_${c.id.slice(0, 8)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      MessagePlugin.success('全卷档案导出成功！');
    } catch (err: any) {
      MessagePlugin.error(err.message || '全卷导出失败');
    }
  };

  // 客户端筛选
  const filteredList = useMemo(() => {
    return list.filter((c) => {
      const name = c.candidateName || '';
      const phone = c.candidatePhone || '';
      if (keyword && !name.includes(keyword) && !phone.includes(keyword)) return false;
      if (roundFilter && c.currentRound !== roundFilter) return false;
      if (statusFilter && c.status !== statusFilter) return false;
      return true;
    });
  }, [list, keyword, roundFilter, statusFilter]);

  const columns = [
    {
      colKey: 'candidate',
      title: '候选人',
      width: 160,
      cell: ({ row }: any) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <UserIcon style={{ color: '#0052d9' }} />
          <div>
            <div style={{ fontWeight: 600, color: '#1A1A1A' }}>{row.candidateName || '候选人'}</div>
            <div style={{ fontSize: 12, color: '#7A7A7A' }}>{row.candidatePhone || '—'}</div>
          </div>
        </div>
      ),
    },
    {
      colKey: 'material',
      title: '申报来源档案',
      minWidth: 200,
      cell: ({ row }: any) => (
        <span style={{ fontSize: 13, color: '#4A4A4A' }}>{row.materialTitle || '资格材料已通过初审入池'}</span>
      ),
    },
    {
      colKey: 'rounds',
      title: '四轮线下联审进度',
      width: 260,
      cell: ({ row }: any) => {
        const reviews = row.reviews || [];
        const rounds = [
          { key: 'R1', name: '材料初审', desc: '村级工作人员核验报名材料完整性' },
          { key: 'R2', name: '镇街初审', desc: '乡镇/街道一级资格初步审核' },
          { key: 'R3', name: '区级联审', desc: '区级11部门多部门联合资格审查' },
          { key: 'R4', name: '党委考察', desc: '党工委/党委考察确定正式候选人' },
        ];
        return (
          <Space size="small">
            {rounds.map((r) => {
              const rev = reviews.find((x: any) => x.round === r.key);
              const isPass = rev?.decision === 'approved';
              const isFail = rev?.decision === 'rejected';
              const isCurrent = row.currentRound === r.key && row.status === 'reviewing';

              return (
                <GuideTip
                  key={r.key}
                  title={`${r.key} · ${r.name}`}
                  content={r.desc}
                  placement="top"
                >
                  <Tag
                    size="small"
                    theme={isPass ? 'success' : isFail ? 'danger' : isCurrent ? 'warning' : 'default'}
                    variant={isPass || isFail || isCurrent ? 'light' : 'outline'}
                  >
                    {r.key}:{isPass ? '过' : isFail ? '否' : isCurrent ? '审' : '待'}
                  </Tag>
                </GuideTip>
              );
            })}
          </Space>
        );
      },
    },
    {
      colKey: 'status',
      title: '当前资格判定',
      width: 160,
      cell: ({ row }: any) => {
        if (row.status === 'rejected') {
          return <Tag theme="danger" variant="light">审查不合格·淘汰</Tag>;
        }
        if (row.currentRound === 'complete' && row.status === 'approved') {
          return <Tag theme="success" variant="dark">正式候选人</Tag>;
        }
        return (
          <Tag theme="warning" variant="light">
            进行中（{ROUND_CONFIG[row.currentRound]?.short || '审查中'}）
          </Tag>
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
              setCurrentCandidate(row);
              setDetailVisible(true);
            }}
          >
            资格全案
          </Button>

          {row.status === 'reviewing' && (
            <PermGate perm="candidate:review" roles={['platform_admin', 'sub_admin', 'reviewer']}>
              <Button
                theme="primary"
                variant="text"
                size="small"
                onClick={() => openReviewModal(row)}
              >
                回填联审结果
              </Button>
            </PermGate>
          )}
        </Space>
      ),
    },
  ];

  // 第一级：若未选择具体届次，展示选举活动届次列表
  if (!currentFief) {
    return (
      <div style={{ padding: 24, background: '#FAF8F5', minHeight: '100%' }}>
        <ElectionSessionList
          title="候选人管理"
          sub="候选人按届次管理：先选择具体届次，即可查看入围人选名单，并逐轮回填 R1～R4 联审结论。"
          data={fiefs}
          loading={loading}
          statLabel="入围候选人数"
          statOf={(f) => {
            const fiefCands = list.filter((c) => c.electionFiefId === f.id);
            const passed = fiefCands.filter((c) => c.status === 'approved' && c.currentRound === 'complete').length;
            return (
              <Tag theme={passed > 0 ? 'success' : fiefCands.length > 0 ? 'primary' : 'default'} variant="light">
                {fiefCands.length} 位入围 {passed > 0 ? `（${passed} 位联审通过）` : ''}
              </Tag>
            );
          }}
          onEnter={(f) => {
            setCurrentFief(f);
            setSelectedFiefId(f.id);
          }}
          enterText="查看候选人"
        />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, background: '#FAF8F5', minHeight: '100%' }}>
      {/* 第二级：顶部带返回与当前届状态条 */}
      <SessionDetailBar
        fief={currentFief}
        onBack={() => setCurrentFief(null)}
        extra={
          <Tag theme="primary" variant="light">
            本届入围候选人 {filteredList.filter((c) => !currentFief || c.electionFiefId === currentFief.id).length} 位
          </Tag>
        }
      />

      <Card
        bordered
        title={`【${currentFief.name}】候选人资格四轮联审管理池`}
        description="初审合格参选人依法进入本池，依序完成 R1 镇街初审、R2 代表预选、R3 部门联审、R4 党委考察；线下审查结论由经办按文号线上回填。"
      >
        {/* 工具栏 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <Space>
            <Input
              style={{ width: 220 }}
              placeholder="搜索姓名或手机号..."
              value={keyword}
              onChange={setKeyword}
              clearable
            />
            <Select
              style={{ width: 150 }}
              placeholder="审核轮次"
              value={roundFilter}
              onChange={(v: any) => setRoundFilter(v)}
              clearable
              options={[
                { label: '全部轮次', value: '' },
                { label: 'R1 镇街初审', value: 'R1' },
                { label: 'R2 代表预选', value: 'R2' },
                { label: 'R3 部门联审', value: 'R3' },
                { label: 'R4 党委考察', value: 'R4' },
                { label: '4轮全过 (正式候选人)', value: 'complete' },
              ]}
            />
            <Select
              style={{ width: 140 }}
              placeholder="资格状态"
              value={statusFilter}
              onChange={(v: any) => setStatusFilter(v)}
              clearable
              options={[
                { label: '全部状态', value: '' },
                { label: '审查进行中', value: 'reviewing' },
                { label: '审核通过', value: 'approved' },
                { label: '审查淘汰', value: 'rejected' },
              ]}
            />
            <Button theme="default" variant="base" icon={<RefreshIcon />} onClick={loadData}>
              刷新
            </Button>
          </Space>
        </div>

        <Table
          data={filteredList.filter((c) => !currentFief || c.electionFiefId === currentFief.id)}
          columns={columns}
          rowKey="id"
          loading={loading}
          bordered
          hover
          stripe
        />
      </Card>

      {/* 资格审查全案 Dialog */}
      <Dialog
        header="候选人资格审查全案档案"
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        footer={
          <Space>
            {currentCandidate && (
              <Button
                theme="default"
                variant="outline"
                icon={<DownloadIcon />}
                onClick={() => handleExportDossier(currentCandidate)}
              >
                导出全卷归档
              </Button>
            )}
            {currentCandidate?.status === 'reviewing' && (
              <PermGate perm="candidate:review" roles={['platform_admin', 'sub_admin', 'reviewer']}>
                <Button
                  theme="primary"
                  onClick={() => {
                    if (currentCandidate) openReviewModal(currentCandidate);
                  }}
                >
                  前往回填联审结果
                </Button>
              </PermGate>
            )}
            <Button onClick={() => setDetailVisible(false)}>关闭</Button>
          </Space>
        }
        width={780}
      >
        {currentCandidate && (
          <div>
            <Descriptions
              title="候选人基础资料"
              bordered
              size="small"
              column={2}
              items={[
                { label: '真实姓名', content: currentCandidate.candidateName || '—' },
                { label: '联系电话', content: currentCandidate.candidatePhone || '—' },
                { label: '入池时间', content: currentCandidate.createdAt },
                {
                  label: '最终资格状态',
                  content: (
                    <Tag
                      theme={currentCandidate.status === 'approved' ? 'success' : currentCandidate.status === 'rejected' ? 'danger' : 'warning'}
                      variant="light"
                    >
                      {currentCandidate.status === 'approved' ? '正式候选人资格确认' : currentCandidate.status === 'rejected' ? '联审不通过淘汰' : '审查流程推进中'}
                    </Tag>
                  ),
                },
              ]}
            />

            <h4 style={{ margin: '18px 0 10px', color: '#1A1A1A' }}>四轮线下法定审查回填记录</h4>
            <Steps layout="vertical" sequence="positive" current={getRoundStepIndex(currentCandidate)}>
              {['R1', 'R2', 'R3', 'R4'].map((rKey) => {
                const conf = ROUND_CONFIG[rKey];
                const rev = (currentCandidate.reviews || []).find((x: any) => x.round === rKey);
                return (
                  <StepItem
                    key={rKey}
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontWeight: 600 }}>{conf.name}</span>
                        {rev ? (
                          <Tag theme={rev.decision === 'approved' ? 'success' : 'danger'} size="small" variant="light">
                            {rev.decision === 'approved' ? '审查通过' : '否决淘汰'}
                          </Tag>
                        ) : (
                          <Tag theme="default" size="small" variant="outline">尚未执行</Tag>
                        )}
                      </div>
                    }
                    content={
                      <div style={{ fontSize: 12, color: '#4E5969', marginTop: 4 }}>
                        <div>负责单位：{conf.dept}</div>
                        {rev && (
                          <div style={{ marginTop: 2, color: '#1D2129' }}>
                            回填结论/文号：{rev.note || '审核合规'}
                            <span style={{ color: '#86909C', marginLeft: 8 }}>({String(rev.createdAt || '').slice(0, 16)})</span>
                          </div>
                        )}
                      </div>
                    }
                  />
                );
              })}
            </Steps>
          </div>
        )}
      </Dialog>

      {/* 线下审查结果回填 Dialog */}
      <Dialog
        header="录入线下资格审查结果"
        visible={reviewVisible}
        onClose={() => setReviewVisible(false)}
        confirmBtn={{ content: '确认并录入系统', theme: 'primary', loading: submitting }}
        onConfirm={handleReviewSubmit}
        width={560}
      >
        <Form labelWidth={130}>
          <FormItem label="候选人">
            <Input value={`${currentCandidate?.candidateName || ''} (${currentCandidate?.candidatePhone || ''})`} disabled />
          </FormItem>

          <FormItem label="审查轮次" requiredMark>
            <Radio.Group value={selectedRound} onChange={(v: any) => setSelectedRound(v)}>
              <Radio.Button value="R1">R1 镇街初审</Radio.Button>
              <Radio.Button value="R2">R2 代表预选</Radio.Button>
              <Radio.Button value="R3">R3 部门联审</Radio.Button>
              <Radio.Button value="R4">R4 党委考察</Radio.Button>
            </Radio.Group>
            <div style={{ color: '#7A7A7A', fontSize: 12, marginTop: 4 }}>
              当前审查部门：{ROUND_CONFIG[selectedRound]?.dept}
            </div>
          </FormItem>

          <FormItem label="审查结论" requiredMark>
            <Space>
              <Button
                theme={decision === 'approved' ? 'success' : 'default'}
                variant={decision === 'approved' ? 'base' : 'outline'}
                icon={<CheckCircleIcon />}
                onClick={() => setDecision('approved')}
              >
                合格·通过本轮
              </Button>
              <Button
                theme={decision === 'rejected' ? 'danger' : 'default'}
                variant={decision === 'rejected' ? 'base' : 'outline'}
                icon={<CloseCircleIcon />}
                onClick={() => setDecision('rejected')}
              >
                不合格·淘汰
              </Button>
            </Space>
          </FormItem>

          <FormItem label="线下文号与意见">
            <Input
              value={reviewNote}
              onChange={setReviewNote}
              placeholder="例：城联审字[2026]08号，经公安、纪检联审未发现违规记录"
            />
          </FormItem>

          {decision === 'approved' && selectedRound === 'R4' && (
            <div style={{ padding: '10px 14px', background: '#E8F5ED', borderRadius: 6, fontSize: 12, color: '#2D8B55' }}>
              <strong>说明</strong>：第四轮考察通过后，该人选即确定为<strong>正式候选人</strong>，并在 9 号公告中依法公示。
            </div>
          )}
        </Form>
      </Dialog>
    </div>
  );
});

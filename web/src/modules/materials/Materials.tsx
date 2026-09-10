import React, { memo, useMemo, useState, useEffect, useCallback, useRef } from 'react';
import {
  Card,
  Table,
  Button,
  Dialog,
  Form,
  Input,
  Select,
  Tag,
  Space,
  Descriptions,
  MessagePlugin,
  Divider,
} from 'tdesign-react';
import {
  AddIcon,
  SearchIcon,
  RefreshIcon,
  BrowseIcon,
  DownloadIcon,
  CheckCircleIcon,
  CloseCircleIcon,
  UserIcon,
  FolderIcon,
  UploadIcon,
} from 'tdesign-icons-react';
import {
  getMaterials,
  createMaterial,
  reviewMaterial,
  uploadMaterialFile,
  Material,
} from '../../api/materials';
import { getPositions, Position } from '../../api/positions';
import { getElectionFiefs, ElectionFief } from '../../api/elections';
import { useAuthStore } from '../../stores/useAuthStore';
import { useElectionStore } from '../../stores/useElectionStore';
import { GuideTip } from '../../components/GuideTip';
import { PermGate } from '../../components/PermGate';
import { FileList } from '../../components/FileList';
import { getFileUrl, formatFileSize } from '../../api/files';
import { ElectionSessionList } from '../../components/ElectionSessionList';
import { SessionDetailBar } from '../../components/ElectionSessionList/SessionDetailBar';

const { FormItem } = Form;

const STATUS_META = {
  submitted: { label: '待初审', theme: 'warning' as const },
  approved: { label: '初审通过', theme: 'success' as const },
  rejected: { label: '已驳回', theme: 'danger' as const },
};

export default memo(function MaterialsPage() {
  const [list, setList] = useState<Material[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [fiefs, setFiefs] = useState<ElectionFief[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 选届穿透状态：null 表示在第一级「活动列表」，有值则进入该届明细
  const [currentFief, setCurrentFief] = useState<ElectionFief | null>(null);

  // 筛选状态
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedFiefId, setSelectedFiefId] = useState('');

  // 弹窗状态
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentMaterial, setCurrentMaterial] = useState<Material | null>(null);

  // 组织推荐（代建建档）弹窗
  const [recommendVisible, setRecommendVisible] = useState(false);
  const [recName, setRecName] = useState('');
  const [recPhone, setRecPhone] = useState('');
  const [recPosition, setRecPosition] = useState('');
  const [recNote, setRecNote] = useState('');
  const [recFiles, setRecFiles] = useState<File[]>([]);
  const recFileInputRef = useRef<HTMLInputElement>(null);
  const suppFileInputRef = useRef<HTMLInputElement>(null);

  // 审核批复弹窗
  const [reviewVisible, setReviewVisible] = useState(false);
  const [reviewDecision, setReviewDecision] = useState<'approved' | 'rejected'>('approved');
  const [reviewNote, setReviewNote] = useState('');

  const { user } = useAuthStore();
  const currentFiefId = useElectionStore((s) => s.currentFiefId);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [fiefData, matData] = await Promise.all([
        getElectionFiefs(),
        getMaterials(),
      ]);
      // 本页活动列表按创建时间倒序：最新创建的排最前（后端默认按 d_day 降序返回）
      const sortedFiefs = [...fiefData].sort((a, b) =>
        String(b.createdAt || '').localeCompare(String(a.createdAt || '')),
      );
      setFiefs(sortedFiefs);
      setList(matData);

      const targetFiefId = selectedFiefId || currentFiefId || (sortedFiefs[0]?.id ?? '');
      if (targetFiefId) {
        setSelectedFiefId(targetFiefId);
        const posData = await getPositions({ electionFiefId: targetFiefId });
        setPositions(posData);
        if (posData.length > 0 && !recPosition) {
          setRecPosition(posData[0].name);
        }
      }
    } catch (err: any) {
      MessagePlugin.error(err.message || '加载报名材料失败');
    } finally {
      setLoading(false);
    }
  }, [selectedFiefId, currentFiefId, recPosition]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 提交组织推荐人选
  const handleCreateRecommend = async () => {
    if (!recName.trim() || !recPhone.trim()) {
      MessagePlugin.warning('请填写参选人真实姓名与11位手机号');
      return;
    }
    if (!selectedFiefId) {
      MessagePlugin.warning('当前组织暂无换届活动');
      return;
    }

    setSubmitting(true);
    try {
      const created = await createMaterial({
        electionFiefId: selectedFiefId,
        candidateName: recName.trim(),
        candidatePhone: recPhone.trim(),
        title: `【组织推荐】${recName.trim()} 参选 ${recPosition || '村居委员会'} 报名材料`,
        description: recNote.trim() || undefined,
      });

      // 上传附带的文件
      if (recFiles.length > 0 && created?.id) {
        for (const file of recFiles) {
          await uploadMaterialFile(created.id, file);
        }
      }

      MessagePlugin.success(`已为【${recName.trim()}】建立组织推荐档案，账号密码已预设为 123456`);
      setRecommendVisible(false);
      setRecName('');
      setRecPhone('');
      setRecNote('');
      setRecFiles([]);
      loadData();
    } catch (err: any) {
      MessagePlugin.error(err.message || '录入推荐材料失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 提交初审批复
  const handleReviewSubmit = async () => {
    if (!currentMaterial) return;
    if (reviewDecision === 'rejected' && !reviewNote.trim()) {
      MessagePlugin.warning('驳回材料必须填写审查批注与补正意见');
      return;
    }

    setSubmitting(true);
    try {
      await reviewMaterial(currentMaterial.id, reviewDecision, reviewNote.trim());
      if (reviewDecision === 'approved') {
        MessagePlugin.success('🎉 资格初审通过！参选人已单事务自动推入候选人联审池！');
      } else {
        MessagePlugin.warning('材料已驳回，已反馈需补正事项');
      }
      setReviewVisible(false);
      setDetailVisible(false);
      loadData();
    } catch (err: any) {
      MessagePlugin.error(err.message || '初审操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 附件下载
  const handleDownloadFile = (storageKey?: string, fileName?: string) => {
    if (!storageKey) {
      MessagePlugin.warning('该附件暂无有效下载链接');
      return;
    }
    const url = getFileUrl(storageKey);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || '附件下载';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // 客户端筛选
  const filteredList = useMemo(() => {
    return list.filter((m) => {
      const name = m.candidateName || m.submitterName || '';
      const phone = m.candidatePhone || m.submitterPhone || '';
      if (keyword && !name.includes(keyword) && !phone.includes(keyword)) return false;
      if (statusFilter && m.status !== statusFilter) return false;
      if (typeFilter) {
        const isOrgRecommend = (m.title || '').includes('组织推荐');
        if (typeFilter === 'org' && !isOrgRecommend) return false;
        if (typeFilter === 'self' && isOrgRecommend) return false;
      }
      return true;
    });
  }, [list, keyword, statusFilter, typeFilter]);

  const columns = [
    {
      colKey: 'candidate',
      title: '参选人',
      width: 160,
      cell: ({ row }: any) => {
        const name = row.candidateName || row.submitterName || '参选人';
        const phone = row.candidatePhone || row.submitterPhone || '';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserIcon style={{ color: '#0052d9' }} />
            <div>
              <div style={{ fontWeight: 600, color: '#1A1A1A' }}>{name}</div>
              <div style={{ fontSize: 12, color: '#7A7A7A' }}>{phone}</div>
            </div>
          </div>
        );
      },
    },
    {
      colKey: 'title',
      title: '材料名称 / 申报形式',
      minWidth: 260,
      cell: ({ row }: any) => {
        const isSelf = !row.title.includes('组织推荐');
        return (
          <div>
            <Tag theme={isSelf ? 'primary' : 'default'} variant="light" size="small" style={{ marginRight: 6 }}>
              {isSelf ? '🙋 个人自荐' : '🎖 组织推荐'}
            </Tag>
            <span style={{ fontSize: 13, color: '#1A1A1A' }}>{row.title}</span>
          </div>
        );
      },
    },
    {
      colKey: 'files',
      title: '佐证附件',
      width: 120,
      cell: ({ row }: any) => (
        <Tag theme="default" variant="outline" size="small" icon={<FolderIcon />}>
          {(row.files || []).length} 份文件
        </Tag>
      ),
    },
    {
      colKey: 'submittedAt',
      title: '提交时间',
      width: 150,
      cell: ({ row }: any) => String(row.submittedAt || '').slice(0, 16).replace('T', ' '),
    },
    {
      colKey: 'status',
      title: '初审状态',
      width: 120,
      cell: ({ row }: any) => {
        const meta = STATUS_META[row.status as keyof typeof STATUS_META] || { label: row.status, theme: 'default' };
        const tipContent = row.status === 'approved'
          ? '材料初审已通过 ✅ 此人已自动进入候选人联审池，可在「候选人管理」中查看四轮审查进度。'
          : row.status === 'submitted'
          ? '材料已提交，等待村级工作人员初审。'
          : '草稿状态，尚未提交审核。';
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
        <Space size={8}>
          <Button
            theme="default"
            variant="outline"
            size="medium"
            onClick={() => {
              setCurrentMaterial(row);
              setDetailVisible(true);
            }}
          >
            查验明细
          </Button>

          {row.status === 'submitted' && (
            <PermGate perm="material:review" roles={['platform_admin', 'sub_admin', 'reviewer']}>
              <Button
                theme="primary"
                variant="base"
                size="medium"
                onClick={() => {
                  setCurrentMaterial(row);
                  setReviewDecision('approved');
                  setReviewNote('');
                  setReviewVisible(true);
                }}
              >
                初审批复
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
          title="材料提交管理"
          sub="【层级铁律】先选届：材料按选举活动（届）物理隔离，进入具体届次后查验并审核该届参选人材料。"
          data={fiefs}
          loading={loading}
          statLabel="待审/总材料"
          statOf={(f) => {
            const fiefMats = list.filter((m) => m.electionFiefId === f.id);
            const pending = fiefMats.filter((m) => m.status === 'submitted').length;
            return (
              <Tag theme={pending > 0 ? 'warning' : 'default'} variant="light">
                {pending} 待审 / 共 {fiefMats.length}
              </Tag>
            );
          }}
          onEnter={(f) => {
            setCurrentFief(f);
            setSelectedFiefId(f.id);
          }}
          enterText="查看本届材料"
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
          <Tag theme="warning" variant="light">
            本届待审核 {filteredList.filter((m) => m.status === 'submitted').length} 份
          </Tag>
        }
      />

      <Card bordered title={`【${currentFief.name}】参选人报名资格材料核验表`}>
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
              style={{ width: 140 }}
              placeholder="初审状态"
              value={statusFilter}
              onChange={(v: any) => setStatusFilter(v)}
              clearable
              options={[
                { label: '全部状态', value: '' },
                { label: '待审核', value: 'submitted' },
                { label: '初审通过', value: 'approved' },
                { label: '已驳回', value: 'rejected' },
              ]}
            />
            <Select
              style={{ width: 150 }}
              placeholder="申报类型"
              value={typeFilter}
              onChange={(v: any) => setTypeFilter(v)}
              clearable
              options={[
                { label: '全部类型', value: '' },
                { label: '🙋 个人自荐', value: 'self' },
                { label: '🎖 组织推荐', value: 'org' },
              ]}
            />
            <Button theme="default" variant="base" icon={<RefreshIcon />} onClick={loadData}>
              刷新
            </Button>
          </Space>

          <PermGate perm="material:edit" roles={['platform_admin', 'sub_admin', 'editor']}>
            <Button theme="primary" icon={<AddIcon />} onClick={() => setRecommendVisible(true)}>
              ＋ 录入组织推荐人选
            </Button>
          </PermGate>
        </div>

        <Table
          data={filteredList.filter((m) => !currentFief || m.electionFiefId === currentFief.id)}
          columns={columns}
          rowKey="id"
          loading={loading}
          bordered
          hover
          stripe
        />
      </Card>

      {/* 录入组织推荐 Dialog */}
      <Dialog
        header="录入组织推荐参选人选"
        visible={recommendVisible}
        onClose={() => setRecommendVisible(false)}
        confirmBtn={{ content: '建档并提交材料', theme: 'primary', loading: submitting }}
        onConfirm={handleCreateRecommend}
        width={680}
      >
        <Form labelWidth={130}>
          <FormItem label="参选人姓名" requiredMark>
            <Input value={recName} onChange={setRecName} placeholder="请输入真实姓名" />
          </FormItem>

          <FormItem label="联系手机号" requiredMark>
            <Input value={recPhone} onChange={setRecPhone} placeholder="请输入11位有效手机号" />
            <div style={{ color: '#7A7A7A', fontSize: 12, marginTop: 4 }}>
              若该干部尚未注册，系统将自动开通参选人账号，初始密码默认统一设为 123456。
            </div>
          </FormItem>

          <FormItem label="推荐拟选岗位" requiredMark>
            <Select
              value={recPosition}
              onChange={(v: any) => setRecPosition(v)}
              options={positions.map((p) => ({ label: `${p.name} (需求 ${p.quota} 人)`, value: p.name }))}
            />
          </FormItem>

          <FormItem label="组织推荐说明">
            <Input value={recNote} onChange={setRecNote} placeholder="可填写干部政治素质、群众基础、推荐理由等" />
          </FormItem>

          <FormItem label="资格佐证附件">
            <input
              ref={recFileInputRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files) {
                  setRecFiles(Array.from(e.target.files));
                }
              }}
            />
            <Button
              size="small"
              variant="outline"
              icon={<UploadIcon />}
              onClick={() => recFileInputRef.current?.click()}
            >
              选择文件
            </Button>
            <div style={{ color: '#7A7A7A', fontSize: 12, marginTop: 4 }}>
              支持上传身份证扫描件、任职表、学历证明等多份材料，支持原名原格式高速下载与图片预览。
            </div>
          </FormItem>
        </Form>
      </Dialog>

      {/* 查验材料明细 Dialog */}
      <Dialog
        header="参选资格材料全卷查验"
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        footer={
          <Space>
            {currentMaterial?.status === 'submitted' && (
              <PermGate perm="material:review" roles={['platform_admin', 'sub_admin', 'reviewer']}>
                <Button
                  theme="primary"
                  onClick={() => {
                    setReviewDecision('approved');
                    setReviewNote('');
                    setReviewVisible(true);
                  }}
                >
                  前往资格初审
                </Button>
              </PermGate>
            )}
            <Button onClick={() => setDetailVisible(false)}>关闭</Button>
          </Space>
        }
        width={720}
      >
        {currentMaterial && (
          <div>
            <Descriptions
              title="参选人申报档案"
              bordered
              size="small"
              column={2}
              items={[
                { label: '参选人姓名', content: currentMaterial.candidateName || currentMaterial.submitterName || '—' },
                { label: '联系电话', content: currentMaterial.candidatePhone || currentMaterial.submitterPhone || '—' },
                { label: '申报主题', content: currentMaterial.title, span: 2 },
                { label: '提交时间', content: currentMaterial.submittedAt },
                {
                  label: '初审状态',
                  content: (
                    <Tag
                      theme={STATUS_META[currentMaterial.status as keyof typeof STATUS_META]?.theme || 'default'}
                      variant="light"
                    >
                      {STATUS_META[currentMaterial.status as keyof typeof STATUS_META]?.label || currentMaterial.status}
                    </Tag>
                  ),
                },
                { label: '审核意见/说明', content: currentMaterial.reviewNote || '（暂无批注）', span: 2 },
              ]}
            />

            <h4 style={{ margin: '16px 0 8px', color: '#1A1A1A' }}>归档证明附件清单（支持多附件全量预览与原名原生高速下载）</h4>
            {(!currentMaterial.files || currentMaterial.files.length === 0) ? (
              <div style={{ color: '#999', padding: '12px 0' }}>暂无上传附件文件</div>
            ) : (
              <div style={{ background: '#FAF8F5', borderRadius: 6, border: '1px solid #E8E5E0', padding: 8 }}>
                <FileList files={currentMaterial.files as any} />
              </div>
            )}

            {/* 允许在查验明细时为该材料补充上传证明文件 */}
            <div style={{ marginTop: 16, padding: '12px 14px', background: '#F5F3F0', borderRadius: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#1A1A1A' }}>
                为该参选人补充上传佐证材料 / 审查附件
              </div>
              <input
                ref={suppFileInputRef}
                type="file"
                style={{ display: 'none' }}
                disabled={submitting}
                onChange={async (e) => {
                  if (e.target.files?.[0] && currentMaterial) {
                    const file = e.target.files[0];
                    setSubmitting(true);
                    try {
                      await uploadMaterialFile(currentMaterial.id, file);
                      MessagePlugin.success(`【${file.name}】已成功上传并归档！`);
                      loadData();
                      setDetailVisible(false);
                    } catch (err: any) {
                      MessagePlugin.error(err.message || '上传失败');
                    } finally {
                      setSubmitting(false);
                    }
                  }
                }}
              />
              <Button
                size="small"
                variant="outline"
                loading={submitting}
                icon={<UploadIcon />}
                onClick={() => suppFileInputRef.current?.click()}
              >
                选择文件上传
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* 资格初审批复 Dialog */}
      <Dialog
        header="报名材料资格初审"
        visible={reviewVisible}
        onClose={() => setReviewVisible(false)}
        confirmBtn={{ content: '确认提交初审意见', theme: 'primary', loading: submitting }}
        onConfirm={handleReviewSubmit}
        width={540}
      >
        <Form labelWidth={120}>
          <FormItem label="初审决定" requiredMark>
            <Space>
              <Button
                theme={reviewDecision === 'approved' ? 'success' : 'default'}
                variant={reviewDecision === 'approved' ? 'base' : 'outline'}
                icon={<CheckCircleIcon />}
                onClick={() => setReviewDecision('approved')}
              >
                合格·入池
              </Button>
              <Button
                theme={reviewDecision === 'rejected' ? 'danger' : 'default'}
                variant={reviewDecision === 'rejected' ? 'base' : 'outline'}
                icon={<CloseCircleIcon />}
                onClick={() => setReviewDecision('rejected')}
              >
                不合格·驳回
              </Button>
            </Space>
          </FormItem>

          <FormItem label="审查意见" requiredMark={reviewDecision === 'rejected'}>
            <Input
              value={reviewNote}
              onChange={setReviewNote}
              placeholder={reviewDecision === 'approved' ? '通过初审，符合选民与候选人基本条件' : '请说明资格不符具体条款或需补充证明'}
            />
          </FormItem>

          {reviewDecision === 'approved' && (
            <div style={{ padding: '10px 14px', background: '#E8F5ED', borderRadius: 6, fontSize: 12, color: '#2D8B55' }}>
              💡 <strong>注意</strong>：材料初审合格后，该干部将自动正式进入<strong>候选人池</strong>，启动 R1 镇街资格初审流程。
            </div>
          )}
        </Form>
      </Dialog>
    </div>
  );
});

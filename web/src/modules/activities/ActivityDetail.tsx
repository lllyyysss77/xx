import React, { useEffect, useState, useMemo, useRef, type ChangeEvent } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Button,
  Tag,
  Timeline,
  Empty,
  Dialog,
  MessagePlugin,
  Input,
  Textarea,
  Radio,
  Checkbox,
  Switch,
  InputNumber,
  Space,
  Loading,
} from 'tdesign-react';
import {
  RollbackIcon,
  BrowseIcon,
  FolderIcon,
  UserIcon,
  ErrorCircleFilledIcon,
  CheckCircleFilledIcon,
  ChevronRightIcon,
} from 'tdesign-icons-react';
import { getElectionFief, getFiefStages, ElectionFief, FiefStage } from '../../api/elections';
import { getPositions } from '../../api/positions';
import { validateUploadFile, UPLOAD_ACCEPT } from '../../utils/upload';
import {
  getAnnouncements,
  saveAnnouncement,
  publishAnnouncement,
  uploadAnnouncementFile,
  getAnnouncementFiles,
  Announcement,
} from '../../api/announcements';
import { useAuthStore } from '../../stores/useAuthStore';
import { LegalDocViewer } from '../../components/LegalDocViewer';
import { PermGate } from '../../components/PermGate';
import { GuideTip } from '../../components/GuideTip/GuideTip';
import { MaterialFile, getFileUrl } from '../../api/files';
import { VILLAGE_DOCX_STAGES, COMMUNITY_DOCX_STAGES, DocxStageItem } from '../../utils/docxRules';
import Style from './ActivityDetail.module.less';

const TimelineItem = Timeline.Item;

const STATUS_META: Record<string, { label: string; theme: 'warning' | 'success' | 'default' }> = {
  preparing: { label: '筹备中', theme: 'warning' },
  active: { label: '进行中', theme: 'success' },
  closed: { label: '已归档', theme: 'default' },
  draft: { label: '草稿', theme: 'warning' },
};

// ============================================================
// [TAG-INDEX] ActivityDetail.tsx — 核心工作台（活动详情/公告编辑/考勤锁定）
// [ROUTE-CORE]   L53    ActivityDetailPage — 活动详情页（公告编辑+日程+岗位+候选人聚合）
// [BREAKPOINT]    L428   考勤打卡式锁定 — 环节「已过期·未发布」即失效，禁止保存/补发
// [CORE-FLOW]     公告编辑/保存/发布流程（左栏日程→右栏编辑器）
// [TODO-FIX P2]   L225   硬编码成文日期 fallback '2027年05月18日'（应取活动 d_day 或当前日期）
// [TODO-FIX P2]   L468   硬编码 "选举方式：全民直接选举"（应读 positions.election_method）
// ============================================================
export default function ActivityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();

  const [fief, setFief] = useState<ElectionFief | null>(null);
  // 选举方式（从岗位数据动态推导，不再硬编码）
  const [electionMethodText, setElectionMethodText] = useState('以法定公告为准');
  const [stages, setStages] = useState<FiefStage[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  // 左栏选中的阶段 key，右栏选中的公告编号
  const [selectedStageKey, setSelectedStageKey] = useState(searchParams.get('stage') || '');
  const [selectedAnnNo, setSelectedAnnNo] = useState(searchParams.get('no') || '');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // 公告专属附件
  const annFileInputRef = useRef<HTMLInputElement>(null);
  const [annFiles, setAnnFiles] = useState<MaterialFile[]>([]);
  const [uploadingAnnFile, setUploadingAnnFile] = useState(false);

  // 公文编辑表单
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editSign, setEditSign] = useState('');
  const [editSignDate, setEditSignDate] = useState('');
  const [publishMode, setPublishMode] = useState<'immediate' | 'scheduled'>('immediate');
  const [publishAt, setPublishAt] = useState('');
  const [openMaterial, setOpenMaterial] = useState(false);
  const [remindHours, setRemindHours] = useState(24);
  const [remindTo, setRemindTo] = useState<string[]>(['editor', 'admin']);

  const docxRules = useMemo(() => {
    return user?.orgType === 'community' ? COMMUNITY_DOCX_STAGES : VILLAGE_DOCX_STAGES;
  }, [user]);

  const docxRuleMap = useMemo(() => {
    const m: Record<string, DocxStageItem> = {};
    for (const item of docxRules) {
      // 按数据库稳定主键 stageKey 索引（阶段名历史上有 7 处漂移，字符串匹配不可靠）
      m[item.stageKey] = item;
    }
    return m;
  }, [docxRules]);

  // 从规则文本提取公文编号列表，支持三种写法：
  //  - 子编号：'第6-1号' -> ["6-1"]
  //  - 范围：'第10号 / 第11号 / …'、'第10~15号全套配套公告' -> ["10","11",...]
  //  - 无第前缀：'持续张贴 3 号公告' -> ["3"]；'补充公告' -> ["补充"]
  const parseNoticeNos = (rule?: DocxStageItem): string[] => {
    if (!rule || !rule.announcementNums || rule.announcementNums === '无') return [];

    const nums = new Set<string>();

    // 1) 显式罗列（第X号 / 第X-Y号），如 "第1号 / 第2号 / 第3号"、"第5号 / 第6号 / 第6-1号"
    const explicit = rule.announcementNums.match(/第(\d+(?:-\d+)?)号/g);
    if (explicit) {
      for (const m of explicit) nums.add(m.replace(/[^\d-]/g, ''));
    }

    // 2) 范围写法 "第10~15号" -> 展开 10..15
    const range = rule.announcementNums.match(/第(\d+)~(\d+)号/);
    if (range) {
      const [a, b] = [Number(range[1]), Number(range[2])];
      if (a > 0 && b >= a && b - a <= 50) {
        for (let i = a; i <= b; i++) nums.add(String(i));
      }
    }

    // 3) "持续张贴 X 号公告" / "持续张贴 X~Y 号公告"（无第前缀）
    const cont = rule.announcementNums.match(/持续张贴\s*(\d+)(?:~(\d+))?\s*号/);
    if (cont) {
      const a = Number(cont[1]);
      const b = cont[2] ? Number(cont[2]) : a;
      if (a > 0 && b >= a && b - a <= 50) {
        for (let i = a; i <= b; i++) nums.add(String(i));
      }
    }

    // 4) 补充公告
    if (rule.announcementNums.includes('补充')) nums.add('补充');

    return Array.from(nums);
  };

  const loadAll = async (keepSelection = false) => {
    if (!id) return;
    setLoading(true);
    try {
      const [fiefData, stageData, annData] = await Promise.all([
        getElectionFief(id),
        getFiefStages(id),
        getAnnouncements({ electionFiefId: id }),
      ]);
      setFief(fiefData);
      setStages(stageData);
      setAnnouncements(annData);

      // 动态读取本活动岗位的选举方式（去重后拼接；失败静默不影响主流程）
      getPositions({ electionFiefId: id })
        .then((list: any[]) => {
          const methods = Array.from(new Set(list.map((p) => p?.electionMethod).filter(Boolean)));
          if (methods.length > 0) setElectionMethodText(methods.join('、'));
        })
        .catch(() => {});

      if (!keepSelection && stageData.length > 0 && !selectedStageKey) {
        setSelectedStageKey(stageData[0].stageKey);
      }
    } catch (err: any) {
      MessagePlugin.error(err.message || '加载活动数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [id]);

  // 当前选中的阶段
  const currentStage = useMemo(() => {
    if (stages.length === 0) return null;
    return stages.find((s) => s.stageKey === selectedStageKey) || stages[0];
  }, [stages, selectedStageKey]);

  const currentStageRule = currentStage ? docxRuleMap[currentStage.stageKey] : undefined;
  const stageNoticeNos = useMemo(() => parseNoticeNos(currentStageRule), [currentStageRule]);

  // 当前阶段关联的所有公告实体
  const stageAnnouncements = useMemo(() => {
    if (!currentStage) return [];
    // 精确匹配：templateCode 为 "第X号" 或 "第X-1号" 或 "补充公告"
    return announcements.filter((a) => {
      const code = (a as any).templateCode || (a as any).template_code || '';
      return stageNoticeNos.some((no) => {
        if (no === '补充') return code.includes('补充');
        // 精确正则匹配：如 no="1"，匹配 "第1号"（避免把 "第6-1号" 错误匹配进 1号）
        const reg = new RegExp(`^第?${no}号$`);
        return reg.test(code) || code === `第${no}号`;
      });
    });
  }, [announcements, stageNoticeNos, currentStage]);

  // 当前正在编辑的单份公告
  const activeNo = useMemo(() => {
    if (stageNoticeNos.length === 0) return '';
    if (selectedAnnNo && stageNoticeNos.includes(selectedAnnNo)) return selectedAnnNo;
    return stageNoticeNos[0];
  }, [stageNoticeNos, selectedAnnNo]);

  const currentAnnouncement = useMemo(() => {
    if (stageAnnouncements.length === 0) return null;
    if (activeNo) {
      const found = stageAnnouncements.find((a) => {
        const code = (a as any).templateCode || (a as any).template_code || '';
        if (activeNo === '补充') return code.includes('补充');
        const reg = new RegExp(`^第?${activeNo}号$`);
        return reg.test(code) || code === `第${activeNo}号`;
      });
      if (found) return found;
    }
    return stageAnnouncements[0];
  }, [stageAnnouncements, activeNo]);

  const isPublished = currentAnnouncement?.status === 'published';

  // 切换公告时回显表单数据
  useEffect(() => {
    if (currentAnnouncement) {
      setEditTitle(currentAnnouncement.title || '');
      setEditBody(currentAnnouncement.body || '');
      const isCommunity = user?.orgType === 'community';
      setEditSign(
        currentAnnouncement.annSign ||
          (isCommunity ? `${user?.orgName || ''}居民选举委员会` : `${user?.orgName || ''}村民选举委员会`),
      );
      // 成文日期推导链：公告已填 → 发布日期 → 活动法定选举日（D 日）→ 空；不再兑底写死日期
      const cnDate = (iso?: string) => {
        const d = iso ? String(iso).slice(0, 10) : '';
        return /^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d.slice(0, 4)}年${d.slice(5, 7)}月${d.slice(8, 10)}日` : '';
      };
      setEditSignDate(
        currentAnnouncement.annSignDate || cnDate(currentAnnouncement.publishedAt) || cnDate(fief?.dDay ?? undefined),
      );
      setPublishMode(currentAnnouncement.annPublishMode || 'immediate');
      setPublishAt(currentAnnouncement.annPublishAt || '');
      setOpenMaterial(!!currentAnnouncement.annOpenMaterialSubmit);
      setRemindHours(currentAnnouncement.annRemindHours || 24);

      const rawRemindTo = currentAnnouncement.annRemindTo || 'editor,admin';
      setRemindTo(rawRemindTo.split(',').map((s) => s.trim()).filter(Boolean));

      // 加载附件
      getAnnouncementFiles(currentAnnouncement.id)
        .then(setAnnFiles)
        .catch(() => setAnnFiles([]));
    } else {
      setEditTitle('');
      setEditBody('');
      setAnnFiles([]);
    }
  }, [currentAnnouncement, user]);

  // 保存公文草稿
  const handleSaveDraft = async () => {
    if (!currentAnnouncement) return;
    if (editorLocked) {
      MessagePlugin.warning(
        currentStageStatus === 'unpublished'
          ? '本环节已过法定截止日且未发布，已按规定锁定：禁止保存/补发'
          : '本公告已正式发布，内容已锁定不可修改',
      );
      return;
    }
    setSaving(true);
    try {
      await saveAnnouncement(currentAnnouncement.id, {
        title: editTitle,
        body: editBody,
        annSign: editSign,
        annSignDate: editSignDate,
        annPublishMode: publishMode,
        annPublishAt: publishAt || undefined,
        annOpenMaterialSubmit: openMaterial,
        annRemindHours: remindHours,
        annRemindTo: remindTo.join(','),
      });
      MessagePlugin.success('公文草稿及发文配置已保存');
      loadAll(true);
    } catch (err: any) {
      MessagePlugin.error(err.message || '保存草稿失败');
    } finally {
      setSaving(false);
    }
  };

  // 依法发布公文
  const handlePublish = async () => {
    if (!currentAnnouncement) return;
    if (editorLocked) {
      MessagePlugin.warning(
        currentStageStatus === 'unpublished'
          ? '本环节已过法定截止日且未发布，已按规定锁定：禁止发布/补发，请先联系管理员线下处理'
          : '本公告已正式发布，不可重复发布',
      );
      return;
    }
    if (publishMode === 'scheduled' && !publishAt) {
      MessagePlugin.warning('请选择具体的定时发布时间');
      return;
    }
    setSaving(true);
    try {
      await saveAnnouncement(currentAnnouncement.id, {
        title: editTitle,
        body: editBody,
        annSign: editSign,
        annSignDate: editSignDate,
        annPublishMode: publishMode,
        annPublishAt: publishAt || undefined,
        annOpenMaterialSubmit: openMaterial,
        annRemindHours: remindHours,
        annRemindTo: remindTo.join(','),
      });
      await publishAnnouncement(currentAnnouncement.id);
      MessagePlugin.success(publishMode === 'scheduled' ? `已设定定时发布：${publishAt}` : '公告已正式发布');
      loadAll(true);
    } catch (err: any) {
      MessagePlugin.error(err.message || '发布失败');
    } finally {
      setSaving(false);
    }
  };

  // 上传公告附件（先本地校验格式/大小，再提交）
  const handleUploadAnnFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !currentAnnouncement) return;
    const check = validateUploadFile(file);
    if (!check.ok) {
      MessagePlugin.warning(check.message || '文件不符合上传要求');
      return;
    }
    setUploadingAnnFile(true);
    try {
      await uploadAnnouncementFile(currentAnnouncement.id, file);
      MessagePlugin.success(`公告附件【${file.name}】上传成功`);
      const updated = await getAnnouncementFiles(currentAnnouncement.id);
      setAnnFiles(updated);
    } catch (err: any) {
      MessagePlugin.error(err.message || '附件上传失败');
    } finally {
      setUploadingAnnFile(false);
    }
  };

  // 判断一个阶段是否有至少一份已发布的公告
  const stageHasPublishedAnn = (stage: FiefStage): boolean => {
    const rule = docxRuleMap[stage.stageKey];
    const noticeNos = parseNoticeNos(rule);
    if (noticeNos.length === 0) return false;
    return noticeNos.some((no) => {
      return announcements.some((a) => {
        if (a.status !== 'published') return false;
        const code = (a as any).templateCode || (a as any).template_code || '';
        if (no === '补充') return code.includes('补充');
        const reg = new RegExp(`^第?${no}号$`);
        return reg.test(code) || code === `第${no}号`;
      });
    });
  };

  // 全局今日日期（本地时区）
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // 科学推导全流程阶段状态字典：脱离死板的 endDate<todayStr，以真实发文与推进接棒为第一真相
  const stageDisplayStatusMap = useMemo(() => {
    const map: Record<string, 'done' | 'current' | 'todo' | 'unpublished'> = {};
    if (stages.length === 0) return map;

    // 1. 先计算每个阶段自身是否直接发了文
    const directPubList = stages.map((s) => stageHasPublishedAnn(s));

    // 2. 判定各阶段完成态（产品规则）：
    //    - 有公告发布要求的环节：完成 = 确有真实发布留痕（绝不使用后端按日期自动推导的 status，
    //      end<today 后端一律置 completed，与是否真实发文无关）；
    //    - 没有公告要发布的环节（如前期筹备等纯线下组织环节）：它本就不产生任何公文，
    //      因此只要其业务时间窗口已过，即为已完成；窗口未过时随前后已有真实发文接棒完成。
    //    - 其余"业务窗口已过但找不到发布记录"的环节，一律走下方 unpublished（已过期·未发布）。
    const isDoneList = stages.map((s, idx) => {
      if (directPubList[idx]) return true;
      const rule = docxRuleMap[s.stageKey];
      const noticeNos = parseNoticeNos(rule);
      if (noticeNos.length === 0) {
        // 无需发文的环节：业务时间已过 → 自然完成；未过期时随前后真实发文接棒完成
        const businessOver = !!s.endDate && s.endDate < todayStr;
        const hasPeerDone = directPubList.slice(0, idx).some(Boolean) || directPubList.slice(idx + 1).some(Boolean);
        if (businessOver || hasPeerDone) return true;
      }
      return false;
    });

    // 3. 找到当前推进的第一棒（未完成的第一个阶段）
    const firstUnfinishedIdx = isDoneList.findIndex((done) => !done);

    // 4. 计算每个阶段的最终显示状态
    stages.forEach((s, idx) => {
      const isDone = isDoneList[idx];
      const sStart = s.startDate || '';
      const sEnd = s.endDate || '';
      const rule = docxRuleMap[s.stageKey];
      const noticeNos = parseNoticeNos(rule);

      if (isDone) {
        map[s.stageKey] = 'done';
        return;
      }

      // 逾期警告：若当前系统时间已超过法定结束日，且该阶段有法定公文要求但尚未发文
      if (sEnd && sEnd < todayStr && noticeNos.length > 0) {
        map[s.stageKey] = 'unpublished';
        return;
      }

      // 进行中：时间正处于该法定区间内，或者作为当前推进的第一棒
      const isTimeCurrent = sStart && sEnd && todayStr >= sStart && todayStr <= sEnd;
      const isFirstActive = idx === firstUnfinishedIdx;

      if (isTimeCurrent || isFirstActive) {
        map[s.stageKey] = 'current';
        return;
      }

      map[s.stageKey] = 'todo';
    });

    return map;
  }, [stages, announcements, docxRuleMap, todayStr]);

  const getStageDisplayStatus = (s: FiefStage): 'done' | 'current' | 'todo' | 'unpublished' => {
    return stageDisplayStatusMap[s.stageKey] || 'todo';
  };

  // [BREAKPOINT] 考勤打卡式锁定 — 环节一旦「已过期·未发布」，错过法定窗口即失效，禁止保存/补发（法定留痕断点）
  // 考勤打卡式锁定：环节一旦「已过期 · 未发布」，错过法定窗口即失效，
  // 编辑器整体只读，禁止事后编辑/补发（如需补正须走管理员线下核准）
  const currentStageStatus: 'done' | 'current' | 'todo' | 'unpublished' = currentStage
    ? stageDisplayStatusMap[currentStage.stageKey] || 'todo'
    : 'todo';
  const editorLocked = isPublished || currentStageStatus === 'unpublished';

  if (loading) {
    return <Loading loading text="正在加载活动工作台…" fullscreen={false} />;
  }

  if (!fief) {
    return (
      <div className={Style.missing}>
        <Empty description="未找到指定的选举活动" />
        <Button variant="outline" onClick={() => navigate('/election/activities')}>
          返回活动列表
        </Button>
      </div>
    );
  }

  return (
    <div className={Style.wrap}>
      {/* 头部信息大栏 */}
      <div className={Style.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className={Style.headerTitle}>
            <span className={Style.bar} />
            <span>{fief.name}</span>
          </div>
          <Button theme="default" variant="outline" size="small" icon={<RollbackIcon />} onClick={() => navigate('/election/activities')}>
            返回活动列表
          </Button>
        </div>
        <div className={Style.headerSub}>
          <Tag theme={STATUS_META[fief.status]?.theme || 'default'} variant="light">
            {STATUS_META[fief.status]?.label || fief.status}
          </Tag>
          <span>归属组织：{user?.orgType === 'community' ? '城市社区居委会' : '农村村民委员会'}</span>
          {/* [FIXED P2 2026-09-10] 选举方式改为动态读取岗位数据，不再硬编码 */}
          <span>选举方式：{electionMethodText}</span>
          <span className={Style.dday}>
            正式选举日（D 日）：<b>{fief.dDay}</b>
          </span>
        </div>
      </div>

      {/* 主体两栏：左 16 阶段流程轴 ｜ 右经办一站式工作台 */}
      <div className={Style.mainGrid}>
        {/* 左栏：16 阶段流程时间轴 */}
        <div className={Style.leftCol}>
          <div className={Style.card}>
            <div className={Style.cardTitle}>选举时间轴（按 D 日倒排 · 点选阶段）</div>
            <div className={Style.stageHint}>
              D = 正式选举日（{fief.dDay}）。点选左侧任一阶段，即可在右侧工作台一站式完成该阶段的公告起草、附件归档、申报通道与提醒设置。
            </div>

            {/* 今日进度直观指示条 */}
            <div className={Style.todayAnchorBar}>
              <span className={Style.todayTag}>今日：{todayStr}</span>
              <span className={Style.todayTip}>系统已根据今日进度与发文记录自动标记各阶段状态</span>
            </div>

            <Timeline mode="same" className={Style.timeline}>
              {stages.map((s) => {
                const ss = getStageDisplayStatus(s);
                const isSelected = currentStage?.stageKey === s.stageKey;
                const rule = docxRuleMap[s.stageKey];
                const noticeNos = parseNoticeNos(rule);

                const dotColor =
                  ss === 'current' ? '#D54941'
                  : ss === 'done' ? '#2BA471'
                  : ss === 'unpublished' ? '#E7700B'
                  : '#D4D0CA';

                return (
                  <TimelineItem
                    key={s.id || s.stageKey}
                    label={
                      <div className={Style.tlLabel}>
                        <div className={Style.tlDate}>{s.startDate ? s.startDate.slice(5) : '待定'}</div>
                        <div className={Style.tlKey}>{s.stageKey}</div>
                      </div>
                    }
                    dotColor={dotColor}
                  >
                    <div
                      className={`${Style.stageCard} ${Style[`stage-${ss}`]} ${isSelected ? Style.stageSelected : ''}`}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      onClick={() => {
                        setSelectedStageKey(s.stageKey);
                        if (noticeNos.length > 0) setSelectedAnnNo(noticeNos[0]);
                      }}
                      onKeyDown={(e) => {
                        /* 键盘可达：Enter/空格 与鼠标同效（政务无障碍验收） */
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedStageKey(s.stageKey);
                          if (noticeNos.length > 0) setSelectedAnnNo(noticeNos[0]);
                        }
                      }}
                    >
                      <div className={Style.stageHead}>
                        <span className={Style.stageName}>{s.stageName}</span>
                        <div className={Style.stageTags}>
                          {ss === 'current' && (
                            <GuideTip content="当前日期正处于本法定阶段，请按时推进并依法发布对应公告" placement="top">
                              {/* theme 由 danger 改 primary：红色全站只留给驳回/超期/危险，「进行中」是正常态 */}
                              <Tag size="small" theme="primary" variant="light">进行中</Tag>
                            </GuideTip>
                          )}
                          {ss === 'done' && (
                            <GuideTip content="本阶段法定公告已完成张贴发布，记录已依法留痕" placement="top">
                              <Tag size="small" theme="success" variant="light" icon={<CheckCircleFilledIcon />}>已完成</Tag>
                            </GuideTip>
                          )}
                          {ss === 'unpublished' && (
                            <GuideTip content="本环节已过法定截止日但系统未检测到发布记录：按规定锁定，右栏仅可查看，禁止事后补发（需管理员线下核准）。" placement="top">
                              <Tag size="small" theme="warning" variant="light" icon={<ErrorCircleFilledIcon />}>
                                未发布 · 已过期锁定
                              </Tag>
                            </GuideTip>
                          )}
                          {isSelected && ss !== 'unpublished' && <Tag size="small" theme="warning" variant="dark">编辑中</Tag>}
                          {isSelected && ss === 'unpublished' && <Tag size="small" theme="danger" variant="dark">查看 · 已锁定</Tag>}
                        </div>
                      </div>

                      {rule?.workItems && (
                        <div className={Style.stageRow}>
                          <span className={Style.stageLabel}>核心工作</span>
                          <span>{rule.workItems.split('\n')[0]}</span>
                        </div>
                      )}

                      {rule?.systemAction && (
                        <div className={Style.stageRow}>
                          <span className={Style.stageLabel}>系统动作</span>
                          <span>{rule.systemAction}</span>
                        </div>
                      )}

                      {noticeNos.length > 0 && (
                        <div className={Style.stageRow}>
                          <span className={Style.stageLabel}>法定公告</span>
                          <span className={Style.announcementDesc}>
                            <span className={Style.noticeChips}>
                              {noticeNos.map((no) => (
                                <Tag
                                  key={no}
                                  size="small"
                                  theme="primary"
                                  variant={no === activeNo && isSelected ? 'dark' : 'outline'}
                                  className={Style.noticeChip}
                                  onClick={(context: any) => {
                                    context?.e?.stopPropagation?.();
                                    context?.stopPropagation?.();
                                    setSelectedStageKey(s.stageKey);
                                    setSelectedAnnNo(no);
                                  }}
                                >
                                  {no}号
                                </Tag>
                              ))}
                            </span>
                          </span>
                        </div>
                      )}
                      <ChevronRightIcon className={Style.stageChevron} />
                    </div>
                  </TimelineItem>
                );
              })}
            </Timeline>
          </div>
        </div>

        {/* 右栏：小编一站式工作台 */}
        <div className={Style.workCol}>
          <div className={`${Style.card} ${Style.workbench}`}>
            <div className={Style.wbTitle}>
              <span className={Style.bar} />
              <span>经办工作台 · {currentStage?.stageName || '阶段工作'}</span>
            </div>
            {currentStage && (
              <div className={Style.wbSub}>
                <span>
                  法定周期：{currentStage.startDate} ~ {currentStage.endDate}
                </span>
                <span>阶段标识：{currentStage.stageKey}</span>
              </div>
            )}

            {stageNoticeNos.length === 0 ? (
              <div className={Style.wbEmpty}>
                {currentStageRule
                  ? '本阶段按法定流程无需另行发布编号公告，请按左侧「核心工作」线下组织推进即可。'
                  : '本阶段未配置公文规则（可线下组织推进），如需发文请联系管理员维护模板映射。'}
              </div>
            ) : !currentAnnouncement ? (
              <div className={Style.wbEmpty}>公告草稿正在加载中…</div>
            ) : (
              <div>
                {/* 多份公告自由切换 */}
                {stageNoticeNos.length > 1 && (
                  <div className={Style.wbField}>
                    <div className={Style.wbLabel}>本阶段需发公文（点击切换编辑）：</div>
                    <Radio.Group
                      variant="default-filled"
                      size="small"
                      value={activeNo}
                      onChange={(v: any) => setSelectedAnnNo(v)}
                    >
                      {stageNoticeNos.map((no) => (
                        <Radio.Button key={no} value={no}>
                          第{no}号公告
                        </Radio.Button>
                      ))}
                    </Radio.Group>
                  </div>
                )}

                {/* 公告标题 */}
                <div className={Style.wbField}>
                  <div className={Style.wbLabel}>公告公文标题</div>
                  <Input value={editTitle} onChange={setEditTitle} placeholder="请输入公告标题" disabled={editorLocked} />
                </div>

                {/* 公文正文编辑 */}
                  <div className={Style.wbField}>
                    <div className={Style.wbLabel}>
                      法定公文正文（由官方发文标准模板派生，基层经办可依实情调整）
                    </div>
                    <Textarea
                      value={editBody}
                      onChange={setEditBody}
                      autosize={{ minRows: 8, maxRows: 16 }}
                      disabled={editorLocked}
                      placeholder={
                        editorLocked
                          ? isPublished
                            ? '本公告已正式发布留痕，内容已锁定不可修改'
                            : '本环节已过法定截止日且未发布，系统已按规定锁定编辑器（禁止补发），内容仅供查阅'
                          : '请输入公告正文'
                      }
                    />
                    <div className={Style.wbBtns}>
                      <Button size="small" variant="outline" icon={<BrowseIcon />} className={Style.wbPreviewBtn} onClick={() => setPreviewVisible(true)}>
                        预览红头大字排版
                      </Button>
                      {isPublished && (
                        <GuideTip content="本文书已正式依法发布并留痕，所有表单已进入只读锁定状态。" placement="top">
                          <Tag size="small" theme="success" variant="light" icon={<CheckCircleFilledIcon />}>
                            已正式发布（只读留痕）
                          </Tag>
                        </GuideTip>
                      )}
                      {!isPublished && currentStageStatus === 'unpublished' && (
                        <GuideTip
                          content="本环节已过法定截止日但无发布记录，已按规定锁定编辑器：错过即失效，禁止事后补发。如需补正请联系管理员线下核准。"
                          placement="top"
                        >
                          <Tag size="small" theme="warning" variant="light" icon={<ErrorCircleFilledIcon />}>
                            未发布 · 编辑器锁定
                          </Tag>
                        </GuideTip>
                      )}
                      {!isPublished && currentStageStatus !== 'unpublished' && (
                        <GuideTip content="建议在点击「确认依法发布」前，先通过「预览红头大字排版」核对红头字号与落款，确保公文严肃合规。" placement="top">
                          <Tag size="small" theme="primary" variant="light">
                            待发布核校
                          </Tag>
                        </GuideTip>
                      )}
                    </div>
                  </div>

                {/* 双轨落款与成文日期 */}
                <div className={Style.wbField}>
                  <div className={Style.wbLabel}>落款单位 / 成文日期（双轨法定推导）</div>
                  <div className={Style.wbRow}>
                    <Input
                      style={{ flex: 1 }}
                      value={editSign}
                      onChange={setEditSign}
                      placeholder="落款单位 (如: 华亭镇五云村村民选举委员会)"
                      disabled={editorLocked}
                    />
                    <Input
                      style={{ width: 220 }}
                      value={editSignDate}
                      onChange={setEditSignDate}
                      placeholder="成文日期（如 2026年09月10日）"
                      disabled={editorLocked}
                    />
                  </div>
                </div>

                {/* 本公告专属附件与群众申报通道 */}
                <div className={Style.wbField}>
                  <div className={Style.wbLabel}>
                    本公告专属附件（{annFiles.length} 份 · 上传后供群众端小程序查看下载）
                  </div>
                  <div className={Style.wbRow}>
                    <input
                      type="file"
                      ref={annFileInputRef}
                      style={{ display: 'none' }}
                      accept={UPLOAD_ACCEPT}
                      onChange={handleUploadAnnFile}
                    />
                    <Button
                      size="small"
                      variant="outline"
                      className={Style.wbUploadBtn}
                      loading={uploadingAnnFile}
                      onClick={() => annFileInputRef.current?.click()}
                      disabled={editorLocked}
                    >
                      上传红头扫描件 / 附件
                    </Button>
                    <span className={Style.wbHint}>支持 PDF / Word / 图片 / ZIP / TXT，不超过 20MB</span>
                  </div>

                  {annFiles.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      {annFiles.map((f) => (
                        <div key={f.id} style={{ fontSize: 13, color: 'var(--td-brand-color)', marginTop: 4 }}>
                          {f.storageKey && /^[a-f0-9]{32}(\.[a-zA-Z0-9]{1,10})?$/.test(f.storageKey) ? (
                            <a href={getFileUrl(f.storageKey)} target="_blank" rel="noreferrer">
                              {f.fileName}
                            </a>
                          ) : (
                            <span style={{ color: 'var(--td-text-color-disabled, #999)' }}>{f.fileName}（文件缺失）</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className={Style.wbRow} style={{ marginTop: 14 }}>
                    <Switch value={openMaterial} onChange={setOpenMaterial} disabled={editorLocked} />
                    <span className={Style.wbHint} style={{ fontWeight: 600 }}>
                      开启参选申报通道（开启后，微信小程序端本公告下方将出现「提交参选材料」入口）
                    </span>
                  </div>
                </div>

                {/* 发布与经办提醒 */}
                <div className={Style.wbPublish}>
                  <div className={Style.wbLabel}>发文方式与经办提醒</div>
                  <Radio.Group value={publishMode} onChange={(v: any) => setPublishMode(v)} disabled={editorLocked}>
                    <Radio value="immediate">立即公开张贴发布</Radio>
                    <Radio value="scheduled">定时自动张贴发布</Radio>
                  </Radio.Group>
                  {publishMode === 'scheduled' && (
                    <div>
                      <input
                        type="datetime-local"
                        className={Style.dtInput}
                        value={publishAt}
                        onChange={(e) => setPublishAt(e.target.value)}
                        disabled={editorLocked}
                      />
                    </div>
                  )}

                  <div className={Style.wbLabel} style={{ marginTop: 12 }}>
                    日程提醒（防漏事通知）
                  </div>
                  <div className={Style.wbRow}>
                    <span className={Style.wbHint}>提前</span>
                    <InputNumber
                      size="small"
                      min={0}
                      max={720}
                      value={remindHours}
                      onChange={(v) => setRemindHours(Number(v) || 0)}
                      style={{ width: 90 }}
                      disabled={editorLocked}
                    />
                    <span className={Style.wbHint}>小时，将提醒发送给：</span>
                    <Checkbox.Group
                      value={remindTo}
                      onChange={(v: any) => setRemindTo(v)}
                      disabled={editorLocked}
                      options={[
                        { label: '经办编辑', value: 'editor' },
                        { label: '选委会管理员', value: 'admin' },
                      ]}
                    />
                  </div>

                  <div className={Style.wbFootBtns}>
                    {editorLocked ? (
                      <Tag size="small" theme={isPublished ? 'success' : 'warning'} variant="light">
                        {isPublished
                          ? '此公告已正式发布，内容为法定公示留痕，不可修改'
                          : '已过法定截止日且未发布：已锁定，禁止保存/补发；如需补正请联系管理员线下核准'}
                      </Tag>
                    ) : (
                      <>
                        <Button variant="outline" loading={saving} onClick={handleSaveDraft}>
                          保存草稿
                        </Button>
                        <PermGate perm="announcement:publish" roles={['platform_admin', 'sub_admin', 'editor']}>
                          <Button theme="primary" loading={saving} onClick={handlePublish}>
                            {publishMode === 'scheduled' ? '设定定时发布' : '确认依法发布'}
                          </Button>
                        </PermGate>
                      </>
                    )}
                    <Button
                      size="small"
                      variant="text"
                      className={Style.wbConfigLink}
                      onClick={() => navigate('/admin/notifications')}
                      style={{ marginLeft: 'auto' }}
                    >
                      去配置提醒通道 →
                    </Button>
                  </div>
                </div>

                {/* 阶段快速跳跃通道 */}
                <div className={Style.wbOthers}>
                  <Button size="small" variant="text" icon={<FolderIcon />} onClick={() => navigate('/election/materials')}>
                    前往材料记录（查验选民/参选材料）→
                  </Button>
                  <Button size="small" variant="text" icon={<UserIcon />} onClick={() => navigate('/election/candidates')}>
                    前往候选人联审（四轮资格审查）→
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 红头公文预览 Dialog */}
      <Dialog
        visible={previewVisible}
        header="法定红头公文排版预览"
        width={820}
        footer={<Button onClick={() => setPreviewVisible(false)}>关闭预览</Button>}
        onClose={() => setPreviewVisible(false)}
      >
        <LegalDocViewer
          announcement={{
            title: editTitle,
            body: editBody,
            annSign: editSign,
            annSignDate: editSignDate,
          }}
          orgName={user?.orgName}
          orgType={user?.orgType}
        />
      </Dialog>
    </div>
  );
}

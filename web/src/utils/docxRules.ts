/**
 * 倒排工期表与法定公文模板字典（对齐数据库真相源）
 * 来源：数据库 stage_templates（16 阶段，org_type=village/community）+ announcement_templates（at_code）
 * 2026-09-08 对齐：stageKey 与库 stage_key 完全一致；公告号与库 at_code 完全一致。
 */
import { OrgType } from './pipelineEngine';

export interface DocxStageItem {
  stageKey: string;          // 数据库 stage_key（稳定主键，唯一匹配依据）
  offsetLabel: string;       // 如 "D-35"
  stageName: string;         // 阶段名称（与库 st_name 一致）
  workItems: string;         // 核心工作事项
  announcementNums: string;  // 需发布公告 (如 "第1号 / 第2号 / 第3号")
  systemAction: string;      // 系统对应业务操作
}

// 甲方村委会线 16 阶段完整业务映射（与数据库 stage_templates village 对齐）
// ============================================================
// [TAG-INDEX] docxRules.ts — 前端日程定义（16 阶段，村/居双轨）
// [CORE-FLOW]    L18    VILLAGE_DOCX_STAGES — 村 16 阶段定义（含 rep_election/primary_election）
// [CORE-FLOW]    L150   COMMUNITY_DOCX_STAGES — 村→居映射（村民→居民等）
// [FIXED P0-3 2026-09-09] 前后端已统一为 16 阶段：后端 rebuild-db.mjs / init-local-db.mjs 的 stage_templates 已修正（含 rep_election/primary_election，voter_list D-28~-24），以权威 docx 为准。前端 docxRules.ts 与后端一致。
//   - 历史问题：后端曾为过时 14 阶段（缺 rep_election/primary_election，voter_list 错放 D-20），已修复。
// ============================================================
export const VILLAGE_DOCX_STAGES: DocxStageItem[] = [
  {
    stageKey: 'prep',
    offsetLabel: 'D-35',
    stageName: '前期筹备',
    workItems: '1. 村两委联席会议定班子职数（主任 1、副主任 1-2、委员，必配女性）\n2. 离任财务审计、村务公示\n3. 筹备选委会推选',
    announcementNums: '无',
    systemAction: '无候选人 / 材料相关操作，仅提案审批模块提交换届启动申请',
  },
  {
    stageKey: 'elect_committee',
    offsetLabel: 'D-34',
    stageName: '成立选委会',
    workItems: '1. 村民代表大会推选 5-9 人选委会\n2. 选委会分工\n3. 表决选举办法',
    announcementNums: '第1号 / 第2号 / 第3号',
    systemAction: '无材料、候选人操作，仅母版配置基础信息',
  },
  {
    stageKey: 'voter_reg',
    offsetLabel: 'D-33~D-29',
    stageName: '选民登记',
    workItems: '逐户登记年满 18 周岁、无剥夺政治权利村民；登记外出、老弱病残流动票箱人员',
    announcementNums: '持续张贴 3 号公告',
    systemAction: '仅选民名册录入，不开放材料上报、候选人流程',
  },
  {
    stageKey: 'voter_list',
    offsetLabel: 'D-28~D-24',
    stageName: '公示选民名单',
    workItems: '汇总全部选民，开启 5 天异议申诉期',
    announcementNums: '第4号',
    systemAction: '无材料、候选人操作',
  },
  {
    stageKey: 'voter_appeal',
    offsetLabel: 'D-23~D-21',
    stageName: '受理选民申诉',
    workItems: '核查资格异议、更正选民名册',
    announcementNums: '补充公告',
    systemAction: '无材料、候选人操作',
  },
  {
    // [FIXED P0-3] rep_election 代表选举阶段 — 前后端均已包含（16 阶段统一）
    stageKey: 'rep_election',
    offsetLabel: 'D-20~D-16',
    stageName: '村民代表和村民小组长选举',
    workItems: '推选村民代表、村民小组长、副组长；推选户代表',
    announcementNums: '第5号 / 第6号 / 第6-1号',
    systemAction: '无候选人 / 材料操作；发布代表名单公告',
  },
  {
    stageKey: 'nominate_start',
    offsetLabel: 'D-15',
    stageName: '候选人提名启动',
    workItems: '1. 发布 7 号提名公告\n2. 开放三类提名：10 人联名 / 个人自荐 / 党组织推荐\n3. 分岗位收集自荐材料',
    announcementNums: '第7号',
    systemAction: '✅候选人提名正式开启\n✅材料上报同步开启（身份证、简历、无犯罪记录）\n✅第一轮审核：材料完整性审核启动',
  },
  {
    stageKey: 'nominate_cont',
    offsetLabel: 'D-14',
    stageName: '候选人提名延续',
    workItems: '持续接收群众自荐、联名推荐材料',
    announcementNums: '持续张贴 7 号公告',
    systemAction: '✅候选人提名持续中\n✅材料上报与初审持续进行',
  },
  {
    stageKey: 'prelim_shortlist',
    offsetLabel: 'D-13',
    stageName: '初步候选人汇总+镇级初审',
    workItems: '汇总全部自荐 / 联名人员，镇级资格初审',
    announcementNums: '第8号 / 第2-1号',
    systemAction: '✅停止接收新的提名与材料上报\n✅完成第一轮材料初审\n✅第二轮审核：镇级资格初审完成，公示 8 号公告\n✅选委会成员被提名者依法自动辞职，按原推选结果依次递补并发布第2-1号公告',
  },
  {
    stageKey: 'primary_election',
    offsetLabel: 'D-12~D-10',
    stageName: '竞选预选',
    workItems: '按差额比例组织竞选预选，确定初步候选人排序',
    announcementNums: '第18号 / 第19号',
    systemAction: '✅预选执行与结果录入；发布第18号预选办法公告、第19号预选结果公告；无新增材料上报',
  },
  {
    stageKey: 'joint_review',
    offsetLabel: 'D-9~D-5',
    stageName: '区级11部门联审、党委考察',
    workItems: '纪检、公安、法院等11部门多部门资格核查、差额配比、党委考察',
    announcementNums: '无（内部联审考察期）',
    systemAction: '✅暂停新增材料上报\n✅第三轮审核：区级11部门多部门联审（查负面清单）\n✅第四轮审核：党委考察确定正式候选人',
  },
  {
    stageKey: 'formal_notice',
    offsetLabel: 'D-4',
    stageName: '正式候选人公示',
    workItems: '联审收尾，确定并张榜公布正式候选人名单（法定硬指标）',
    announcementNums: '第9号',
    systemAction: '✅4轮审核全部通过者转为正式候选人\n✅关闭材料上报，名单公示无异议后具备竞选资格',
  },
  {
    stageKey: 'campaign_prep',
    offsetLabel: 'D-3~D-1',
    stageName: '投票竞选筹备',
    workItems: '确定监票、计票、流动票箱、代写人员；印制选票、布置会场；认定无效票标准',
    announcementNums: '第10号 / 第11号 / 第12号 / 第13号 / 第14号 / 第15号',
    systemAction: '✅竞选筹备期，无新增候选人操作，仅公示竞选配套规则',
  },
  {
    stageKey: 'election_day',
    offsetLabel: 'D日',
    stageName: '正式投票选举',
    workItems: '现场集中投票 + 流动票箱上门投票、当众开箱计票、当场公布当选结果',
    announcementNums: '第16号 / 第17号',
    systemAction: '✅投票选举执行，录入并发布最终当选人员',
  },
  {
    stageKey: 'result_filing',
    offsetLabel: 'D+1~D+5',
    stageName: '结果备案',
    workItems: '整理选举档案，5 日内向乡镇人民政府报送备案',
    announcementNums: '无',
    systemAction: '竞选流程结束，仅归档整理操作',
  },
  {
    stageKey: 'handover',
    offsetLabel: 'D+6~D+10',
    stageName: '新旧班子交接',
    workItems: '完成公章、财务账目、档案、固定资产交接',
    announcementNums: '无',
    systemAction: '全流程终结，所有材料与候选人数据锁定只读🔒',
  },
];

// 甲方居委会线差异映射（与数据库 stage_templates community 对齐）
export const COMMUNITY_DOCX_STAGES: DocxStageItem[] = VILLAGE_DOCX_STAGES.map((s) => {
  // 社区线阶段 key / 名称差异（第 3、4、5 阶段 key 不同，必须显式覆盖）
  if (s.stageKey === 'voter_reg') {
    return {
      ...s,
      stageKey: 'resident_reg',
      stageName: '居民/户代表登记',
      workItems: '5 天登记周期，常住、外出居民登记',
      announcementNums: '持续张贴 3 号社区公告',
      systemAction: '仅居民名册录入，不开放材料、提名',
    };
  }
  if (s.stageKey === 'voter_list') {
    return {
      ...s,
      stageKey: 'resident_list',
      stageName: '公示登记名册',
      workItems: '汇总全部登记居民，开启 5 天异议申诉期',
      announcementNums: '第4号',
      systemAction: '无材料、候选人操作',
    };
  }
  if (s.stageKey === 'voter_appeal') {
    return {
      ...s,
      stageKey: 'resident_appeal',
      stageName: '申诉核查',
      workItems: '核查资格异议、更正登记名册',
      announcementNums: '补充公告',
      systemAction: '无材料、候选人操作',
    };
  }
  if (s.stageKey === 'rep_election') {
    return {
      ...s,
      stageName: '居民代表和户的代表选举',
      workItems: '推选居民代表、户的代表，公布名单',
      announcementNums: '第5号 / 第6号 / 第6-1号',
      systemAction: '无候选人 / 材料操作；发布代表名单公告',
    };
  }
  if (s.stageKey === 'prelim_shortlist') {
    return { ...s, stageName: '初步候选人汇总+街道初审' };
  }
  if (s.stageKey === 'joint_review') {
    return {
      ...s,
      stageName: '区级多部门联审、党工委考察',
      workItems: s.workItems.replace(/镇级/g, '街道级'),
      systemAction: s.systemAction.replace(/镇级/g, '街道级'),
    };
  }
  if (s.stageKey === 'election_day') {
    return { ...s, stageName: '正式竞选投票' };
  }
  if (s.stageKey === 'campaign_prep') {
    return { ...s, stageName: '竞选投票筹备' };
  }
  if (s.stageKey === 'handover') {
    return { ...s, stageName: '新旧班子交接' };
  }
  return {
    ...s,
    workItems: s.workItems.replace(/村/g, '社区').replace(/村民/g, '居民').replace(/乡镇/g, '街道'),
    systemAction: s.systemAction.replace(/村/g, '社区').replace(/村民/g, '居民').replace(/镇级/g, '街道级'),
  };
});

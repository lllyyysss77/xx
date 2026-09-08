/**
 * 核心常规模块：SOP Pipeline 引擎与模板渲染中枢
 * —— 唯一真相源：所有的阶段倒排、村/社区双轨发文正文均由此处收口
 */

export type OrgType = 'village' | 'community';

export interface StageDefinition {
  stageKey: string;
  stageName: string;
  offset: number;      // 相对 D-day 的天数 (如 -35)
  duration: number;    // 持续天数
  order: number;
  description: string;
}

/**
 * 法定 14 阶段日程基线定义（村/社区双轨）
 * 村：选民登记 4 天 (-33 ~ -30)
 * 居：居民登记 5 天 (-33 ~ -29)
 */
export const STAGE_SOP_RULES: Record<OrgType, StageDefinition[]> = {
  village: [
    { stageKey: 'stage_01', stageName: '推选产生村选举委员会', offset: -35, duration: 2, order: 1, description: '召开村民会议或村民代表会议推选产生' },
    { stageKey: 'stage_02', stageName: '发布第1号公告（选委会名单）', offset: -34, duration: 1, order: 2, description: '公布村民选举委员会成员名单' },
    { stageKey: 'stage_03', stageName: '发布第2号公告（选举日及方案）', offset: -34, duration: 1, order: 3, description: '公布选举日及换届选举工作方案' },
    { stageKey: 'stage_04', stageName: '开展选民登记', offset: -33, duration: 4, order: 4, description: '登记具有选民资格的村民（法定4天：D-33至D-30）' },
    { stageKey: 'stage_05', stageName: '发布第3号公告（选民登记时间地点）', offset: -33, duration: 1, order: 5, description: '明确选民登记的时间、地点及申报方式' },
    { stageKey: 'stage_06', stageName: '发布第4号公告（选民资格名单公示）', offset: -20, duration: 20, order: 6, description: '选举日20日前张榜公布选民名单（法定硬指标）' },
    { stageKey: 'stage_07', stageName: '选民申诉与资格更正处理', offset: -19, duration: 4, order: 7, description: '对选民名单有异议的申诉处理与补充公告' },
    { stageKey: 'stage_08', stageName: '发布第7号公告（提名候选人时间地点）', offset: -15, duration: 1, order: 8, description: '公布自荐与推荐候选人报名的起止时间与资格条件' },
    { stageKey: 'stage_09', stageName: '候选人报名、汇总与镇级初审', offset: -15, duration: 3, order: 9, description: '自荐与组织推荐报名，镇级初审筛选' },
    { stageKey: 'stage_10', stageName: '区级11部门联审及党委考察 (R1-R4)', offset: -12, duration: 6, order: 10, description: '纪检、公安、综治等11部门联合资格审查' },
    { stageKey: 'stage_11', stageName: '发布第9号公告（正式候选人名单公示）', offset: -6, duration: 6, order: 11, description: '选举日6日前张榜公布正式候选人名单（法定硬指标）' },
    { stageKey: 'stage_12', stageName: '发布第10-15号公告（大会筹备与投票）', offset: -5, duration: 5, order: 12, description: '公布选举大会时间地点、监票计票人名单及投票注意事项' },
    { stageKey: 'stage_13', stageName: '法定正式选举日 (D-day)', offset: 0, duration: 1, order: 13, description: '召开选举大会，无记名投票，当场计票并公布结果' },
    { stageKey: 'stage_14', stageName: '选举结果备案与新老班子交接', offset: 1, duration: 10, order: 14, description: '发布当选公告，向镇政府报送备案，完成公章与档案移交' },
  ],
  community: [
    { stageKey: 'stage_01', stageName: '推选产生社区选举委员会', offset: -35, duration: 2, order: 1, description: '召开居民会议或居民代表会议推选产生' },
    { stageKey: 'stage_02', stageName: '发布第1号公告（选委会名单）', offset: -34, duration: 1, order: 2, description: '公布居民选举委员会成员名单' },
    { stageKey: 'stage_03', stageName: '发布第2号公告（选举日及方案）', offset: -34, duration: 1, order: 3, description: '公布选举日及换届选举工作方案' },
    { stageKey: 'stage_04', stageName: '开展居民登记', offset: -33, duration: 5, order: 4, description: '登记具有选举权的居民（法定5天：D-33至D-29）' },
    { stageKey: 'stage_05', stageName: '发布第3号公告（居民登记时间地点）', offset: -33, duration: 1, order: 5, description: '明确居民登记的时间、地点及申报方式' },
    { stageKey: 'stage_06', stageName: '发布第4号公告（居民资格名单公示）', offset: -20, duration: 20, order: 6, description: '选举日20日前张榜公布登记居民名单（法定硬指标）' },
    { stageKey: 'stage_07', stageName: '居民申诉与资格更正处理', offset: -19, duration: 4, order: 7, description: '对名单有异议的申诉处理与补充公告' },
    { stageKey: 'stage_08', stageName: '发布第7号公告（提名候选人时间地点）', offset: -15, duration: 1, order: 8, description: '公布自荐与推荐候选人报名的起止时间与资格条件' },
    { stageKey: 'stage_09', stageName: '候选人报名、汇总与街道初审', offset: -15, duration: 3, order: 9, description: '自荐与组织推荐报名，街道初审筛选' },
    { stageKey: 'stage_10', stageName: '区级11部门联审及党工委考察 (R1-R4)', offset: -12, duration: 6, order: 10, description: '纪检、公安、综治等11部门联合资格审查' },
    { stageKey: 'stage_11', stageName: '发布第9号公告（正式候选人名单公示）', offset: -6, duration: 6, order: 11, description: '选举日6日前张榜公布正式候选人名单（法定硬指标）' },
    { stageKey: 'stage_12', stageName: '发布第10-15号公告（大会筹备与投票）', offset: -5, duration: 5, order: 12, description: '公布选举大会时间地点、监票计票人名单及投票注意事项' },
    { stageKey: 'stage_13', stageName: '法定正式选举日 (D-day)', offset: 0, duration: 1, order: 13, description: '召开选举大会，无记名投票，当场计票并公布结果' },
    { stageKey: 'stage_14', stageName: '选举结果备案与新老班子交接', offset: 1, duration: 10, order: 14, description: '发布当选公告，向街道办事处报送备案，完成公章与档案移交' },
  ],
};

/**
 * 纯函数：根据 D-day 自动派生整个活动的法定执行日历
 */
export function calculateSopCalendar(dDayStr: string, orgType: OrgType = 'village') {
  const dDate = new Date(`${dDayStr}T00:00:00Z`);
  const stages = STAGE_SOP_RULES[orgType];

  return stages.map((s) => {
    const start = new Date(dDate);
    start.setUTCDate(start.getUTCDate() + s.offset);

    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + Math.max(0, s.duration - 1));

    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    return {
      ...s,
      startDate: fmt(start),
      endDate: fmt(end),
    };
  });
}

/**
 * 自动化模板渲染器：将抠掉的 {{变量}} 自动补全
 * 小编根本不用手写正文，落款、日期、称谓、地点全由系统自动塞入
 */
export interface TemplateContext {
  orgName: string;           // 如 "霞皋村" 或 "涧口社区"
  orgType: OrgType;          // 'village' | 'community'
  termName?: string;         // 如 "第十一届"
  dDay: string;              // 如 "2026-10-30"
  committeeName?: string;    // 如 "莆田市城厢区霞林街道阔口社区居民选举委员会"
  signDate?: string;         // 如 "2026年10月24日"
  extraParams?: Record<string, string>;
}

export function renderLegalTemplate(rawContent: string, ctx: TemplateContext): string {
  if (!rawContent) return '';
  const isCommunity = ctx.orgType === 'community';

  // 1. 先进行行政称谓的全体系依法置换
  let content = rawContent;
  if (isCommunity) {
    content = content
      .replace(/村民选举委员会/g, '居民选举委员会')
      .replace(/村民代表/g, '居民代表')
      .replace(/村民会议/g, '居民会议')
      .replace(/村民/g, '居民')
      .replace(/乡镇党委/g, '街道党工委')
      .replace(/乡镇人民政府/g, '街道办事处')
      .replace(/乡镇/g, '街道')
      .replace(/党委/g, '党工委');
  }

  // 2. 默认落款推导（如果没填，系统全自动按照法律格式补全）
  const defaultSign = ctx.committeeName || (isCommunity ? `${ctx.orgName}居民选举委员会` : `${ctx.orgName}村民选举委员会`);
  const defaultDate = ctx.signDate || ctx.dDay.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$1年$2月$3日');
  const term = ctx.termName || '本届';

  // 3. 填入占位符
  content = content
    .replace(/\{\{组织名称\}\}/g, ctx.orgName)
    .replace(/\{\{村居名称\}\}/g, ctx.orgName)
    .replace(/\{\{单位名称\}\}/g, ctx.orgName)
    .replace(/\{\{届次\}\}/g, term)
    .replace(/\{\{选举日\}\}/g, ctx.dDay)
    .replace(/\{\{落款单位\}\}/g, defaultSign)
    .replace(/\{\{成文日期\}\}/g, defaultDate);

  if (ctx.extraParams) {
    for (const [k, v] of Object.entries(ctx.extraParams)) {
      content = content.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v);
    }
  }

  return content;
}

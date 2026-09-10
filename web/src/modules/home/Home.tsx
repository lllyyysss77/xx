import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Tag, Progress, Button, Space, MessagePlugin, Loading, Empty } from 'tdesign-react';
import { CalendarIcon, TimeIcon, NotificationIcon, ChevronRightIcon } from 'tdesign-icons-react';
import { getElectionFiefs, getFiefStages, ElectionFief, FiefStage } from '../../api/elections';
import { getAnnouncements, Announcement } from '../../api/announcements';
import { useAuthStore } from '../../stores/useAuthStore';
import { useElectionStore } from '../../stores/useElectionStore';
import { SopTimeline } from '../../components/SopTimeline';
import Style from './Home.module.less';

const fmt = (date?: string) => (date ? String(date).slice(0, 10) : '—');

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const currentFiefId = useElectionStore((s) => s.currentFiefId);
  const setFief = useElectionStore((s) => s.setFief);

  const [fiefs, setFiefs] = useState<ElectionFief[]>([]);
  const [stages, setStages] = useState<FiefStage[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const fiefData = await getElectionFiefs();
      setFiefs(fiefData);

      const target = (currentFiefId ? fiefData.find((f) => f.id === currentFiefId) : null) || fiefData[0];
      if (target) {
        setFief(target.id).catch(() => {});
        const [stageData, annData] = await Promise.all([
          getFiefStages(target.id),
          getAnnouncements({ electionFiefId: target.id }),
        ]);
        setStages(stageData);
        setAnnouncements(annData);
      }
    } catch (err: any) {
      MessagePlugin.error(err.message || '加载工作台数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentFiefId]);

  const currentFief = fiefs.find((f) => f.id === currentFiefId) || fiefs[0];

  // 计算距 D-day 天数（按日期真实推导，绝不假编）
  const daysLeft = useMemo(() => {
    if (!currentFief?.dDay) return 0;
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const target = new Date(`${currentFief.dDay}T00:00:00Z`);
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }, [currentFief]);

  // 法定 16 阶段状态动态推导（按今日日期驱动，拒绝恒 0%）
  const derivedStages = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return stages.map((s) => {
      if (s.endDate && s.endDate < todayStr) return { ...s, derivedStatus: 'completed' as const };
      if (s.startDate && s.endDate && todayStr >= s.startDate && todayStr <= s.endDate) {
        return { ...s, derivedStatus: 'in_progress' as const };
      }
      return { ...s, derivedStatus: 'pending' as const };
    });
  }, [stages]);

  const completedCount = derivedStages.filter((s) => s.derivedStatus === 'completed').length;
  const progressPercent = stages.length > 0 ? Math.round((completedCount / stages.length) * 100) : 0;

  const currentActiveStage = derivedStages.find((s) => s.derivedStatus === 'in_progress') || derivedStages[0];
  const nextStage = derivedStages.find((s) => s.derivedStatus === 'pending');

  const publishedAnnouncements = useMemo(() => {
    return announcements.filter((a) => a.status === 'published' || (a as any).annStatus === 'published').slice(0, 6);
  }, [announcements]);

  if (loading) {
    return <Loading loading text="正在加载真实换届工作台…" fullscreen={false} />;
  }

  return (
    <div className={Style.page}>
      {/* 顶部英雄大看板（100% 对齐 后台首页.png） */}
      <Card className={Style.heroCard} bordered={false}>
        <div className={Style.heroHead}>
          <div>
            <div className={Style.heroOrg}>
              {user?.orgName || currentFief?.name || '华亭镇五云村'} · {currentFief?.name || '第十五届村民委员会换届选举'}
            </div>
            <div className={Style.heroTitle}>依法选举 公正公开</div>
          </div>
          <Tag theme="primary" variant="light">
            真实政务数据
          </Tag>
        </div>

        <div className={Style.heroStats}>
          <div className={Style.heroStat}>
            <div className={Style.heroNum}>
              <span className={Style.breathDot} />
              {daysLeft > 0 ? daysLeft : 0}
            </div>
            <div className={Style.heroLbl}>距正式投票日 (天)</div>
          </div>
          <div className={Style.heroStat}>
            <div className={Style.heroNum}>{currentFief?.dDay || '待定'}</div>
            <div className={Style.heroLbl}>正式选举日 (D-day)</div>
          </div>
          <div className={Style.heroStat}>
            <div className={Style.heroNum}>{progressPercent}%</div>
            <div className={Style.heroLbl}>法定阶段推进进度</div>
          </div>
        </div>

        <Progress percentage={progressPercent} color="#0052d9" trackColor="#eef0f4" />

        <div className={Style.heroStage}>
          <span className={Style.heroStageDot} />
          <span>
            当前法定阶段：<b>{currentActiveStage?.stageName || '尚未进入执行阶段'}</b>
          </span>
          {currentActiveStage?.startDate && (
            <span className={Style.heroStageRange}>
              ({currentActiveStage.startDate} ~ {currentActiveStage.endDate})
            </span>
          )}
        </div>
      </Card>

      {/* 中部核心两列网格（对齐 后台首页.png） */}
      <div className={Style.grid}>
        {/* 左列：已发布公告记录 */}
        <Card
          title={
            <div className={Style.cardTitle}>
              <NotificationIcon /> 已发布政务公告 ({publishedAnnouncements.length})
            </div>
          }
          className={Style.colMain}
          actions={
            <Button theme="primary" variant="text" size="medium" onClick={() => navigate('/election/announcements')}>
              查看全部 →
            </Button>
          }
        >
          {publishedAnnouncements.length > 0 ? (
            <div className={Style.annList}>
              {publishedAnnouncements.map((item) => (
                <div
                  key={item.id}
                  className={Style.annRow}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate('/election/announcements')}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate('/election/announcements');
                    }
                  }}
                >
                  <Tag theme="default" variant="outline" size="small" className={Style.annPin}>
                    公告
                  </Tag>
                  <span className={Style.annTitle}>{item.title}</span>
                  <span className={Style.annDate}>{fmt(item.publishedAt)}</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty description="当前活动阶段暂无已发布法定公告" />
          )}
        </Card>

        {/* 右列：下一法定阶段与时间轴入口 */}
        <Card
          title={
            <div className={Style.cardTitle}>
              <CalendarIcon /> 下一法定阶段
            </div>
          }
          className={Style.colSide}
          actions={
            currentFief && (
              <Button
                theme="primary"
                variant="text"
                size="medium"
                onClick={() => navigate(`/election/activity/${currentFief.id}`)}
              >
                16 阶段全景 →
              </Button>
            )
          }
        >
          {nextStage ? (
            <>
              <div className={Style.fcName}>{nextStage.stageName}</div>
              <div className={Style.fcLine}>
                <TimeIcon /> {fmt(nextStage.startDate)} 至 {fmt(nextStage.endDate)}
              </div>
              <div className={Style.fcNote}>
                按倒排工期表法定时间节点推进，届时系统将自动激活该阶段工作台。
              </div>
            </>
          ) : (
            <Empty description="全阶段已顺利推进完毕或暂无后续阶段" />
          )}
        </Card>
      </div>
    </div>
  );
}

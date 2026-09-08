import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  MessagePlugin,
  Dialog,
  Form,
  Input,
  Select,
  Switch,
  Popconfirm,
  Divider,
} from 'tdesign-react';
import { AddIcon, ChatIcon, SendIcon, DeleteIcon, EditIcon } from 'tdesign-icons-react';
import {
  getWebhookSubscriptions,
  createWebhookSubscription,
  updateWebhookSubscription,
  deleteWebhookSubscription,
  testWebhookSubscription,
  WebhookSubscription,
} from '../../api/webhooks';
import { useAuthStore } from '../../stores/useAuthStore';
import { PermGate } from '../../components/PermGate';

const { FormItem } = Form;

const CHANNEL_MAP: Record<string, { label: string; theme: 'success' | 'primary' | 'default' }> = {
  wecom: { label: '企业微信群机器人', theme: 'success' },
  feishu: { label: '飞书群机器人', theme: 'primary' },
  plain: { label: '自定义 HTTP 接口', theme: 'default' },
};

export default function NotificationsPage() {
  const [list, setList] = useState<WebhookSubscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [channel, setChannel] = useState<'wecom' | 'feishu' | 'plain'>('wecom');
  const [url, setUrl] = useState('');
  const [mobile, setMobile] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  const { user } = useAuthStore();

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getWebhookSubscriptions();
      setList(data);
    } catch (err: any) {
      MessagePlugin.error(err.message || '加载消息订阅失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setName('');
    setChannel('wecom');
    setUrl('');
    setMobile('');
    setModalVisible(true);
  };

  const openEditModal = (item: WebhookSubscription) => {
    setEditingId(item.id);
    setName(item.name);
    setChannel(item.channel);
    setUrl(item.url);
    setMobile(item.mobile || '');
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !url.trim()) {
      MessagePlugin.error('请填写订阅名称和 Webhook 回调地址');
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await updateWebhookSubscription(editingId, {
          name: name.trim(),
          channel,
          url: url.trim(),
          mobile: mobile.trim() || undefined,
        });
        MessagePlugin.success('消息机器人配置已更新');
      } else {
        await createWebhookSubscription({
          name: name.trim(),
          channel,
          url: url.trim(),
          mobile: mobile.trim() || undefined,
        });
        MessagePlugin.success('消息机器人添加成功！');
      }
      setModalVisible(false);
      loadData();
    } catch (err: any) {
      MessagePlugin.error(err.message || '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (item: WebhookSubscription) => {
    try {
      await updateWebhookSubscription(item.id, { active: !item.active });
      MessagePlugin.success(`已${!item.active ? '启用' : '禁用'}推送`);
      loadData();
    } catch (err: any) {
      MessagePlugin.error(err.message || '切换失败');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteWebhookSubscription(id);
      MessagePlugin.success('已删除该推送机器人');
      loadData();
    } catch (err: any) {
      MessagePlugin.error(err.message || '删除失败');
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      await testWebhookSubscription(id);
      MessagePlugin.success('🎉 测试消息已成功推送到群聊！');
    } catch (err: any) {
      MessagePlugin.error(err.message || '测试推送失败，请检查机器人 Webhook 地址');
    } finally {
      setTestingId(null);
    }
  };

  const columns = [
    {
      colKey: 'name',
      title: '订阅名称 / 备注',
      width: 200,
      cell: ({ row }: any) => (
        <Space size="small">
          <ChatIcon style={{ color: '#0052d9' }} />
          <strong>{row.name}</strong>
        </Space>
      ),
    },
    {
      colKey: 'channel',
      title: '渠道类型',
      width: 160,
      cell: ({ row }: any) => {
        const c = CHANNEL_MAP[row.channel] || { label: row.channel, theme: 'default' };
        return <Tag theme={c.theme} variant="light">{c.label}</Tag>;
      },
    },
    {
      colKey: 'url',
      title: 'Webhook 回调 URL',
      width: 320,
      cell: ({ row }: any) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#4e5969' }} title={row.url}>
          {row.url}
        </span>
      ),
    },
    {
      colKey: 'mobile',
      title: '指定提醒人手机',
      width: 140,
      cell: ({ row }: any) => <span>{row.mobile || '群全员'}</span>,
    },
    {
      colKey: 'active',
      title: '状态',
      width: 100,
      cell: ({ row }: any) => (
        <Switch
          value={row.active}
          onChange={() => handleToggleActive(row)}
        />
      ),
    },
    {
      colKey: 'op',
      title: '管理操作',
      width: 220,
      cell: ({ row }: any) => (
        <Space>
          <Button
            theme="primary"
            variant="text"
            size="small"
            icon={<SendIcon />}
            loading={testingId === row.id}
            onClick={() => handleTest(row.id)}
          >
            发送测试
          </Button>

          <Button
            theme="default"
            variant="text"
            size="small"
            icon={<EditIcon />}
            onClick={() => openEditModal(row)}
          >
            编辑
          </Button>

          <Popconfirm content="确认移除此推送机器人吗？" onConfirm={() => handleDelete(row.id)}>
            <Button theme="danger" variant="text" size="small" icon={<DeleteIcon />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="消息订阅与群机器人推送"
        description="支持配置企业微信与飞书群机器人。在【提案批复】、【材料审核】、【公文发布】等法定节点，系统将自动异步向本群推送通知，做到行政留痕与秒级提醒。"
        actions={
          <PermGate perm="webhook:manage" roles={['platform_admin', 'sub_admin']}>
            <Button theme="primary" icon={<AddIcon />} onClick={openCreateModal}>
              添加群机器人订阅
            </Button>
          </PermGate>
        }
      >
        <Table data={list} columns={columns} rowKey="id" loading={loading} />
      </Card>

      {/* 新建/编辑机器人 Dialog */}
      <Dialog
        header={editingId ? '编辑群机器人配置' : '添加群机器人订阅'}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        confirmBtn={{ content: '保存配置', theme: 'primary', loading: submitting }}
        onConfirm={handleSubmit}
        width={560}
      >
        <Form labelWidth={130}>
          <FormItem label="订阅机器人名称" requiredMark>
            <Input
              value={name}
              onChange={(v) => setName(v)}
              placeholder="例如：阔口社区换届工作通知群"
            />
          </FormItem>

          <FormItem label="推送渠道类型" requiredMark>
            <Select
              value={channel}
              onChange={(v: any) => setChannel(v)}
              options={[
                { label: '企业微信群机器人 (WeCom)', value: 'wecom' },
                { label: '飞书群机器人 (Feishu)', value: 'feishu' },
                { label: '自定义 HTTP GET/POST 接口', value: 'plain' },
              ]}
            />
          </FormItem>

          <FormItem label="Webhook 地址" requiredMark>
            <Input
              value={url}
              onChange={(v) => setUrl(v)}
              placeholder="请粘贴企业微信或飞书群机器人的 Webhook URL"
            />
          </FormItem>

          <FormItem label="指定 @ 提醒手机号">
            <Input
              value={mobile}
              maxlength={11}
              onChange={(v) => setMobile(v)}
              placeholder="选填：消息将单独 @ 该干部的手机号"
            />
          </FormItem>

          <Divider style={{ margin: '16px 0' }} />
          <div style={{ color: '#888', fontSize: 12, lineHeight: 1.6 }}>
            提示：Webhook 推送为全异步静默模式。若网络波动或地址失效，绝不会影响主线换届审批流程，系统会在后台记录日志。
          </div>
        </Form>
      </Dialog>
    </div>
  );
}

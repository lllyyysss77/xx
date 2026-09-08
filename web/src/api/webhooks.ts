/**
 * Webhook 通知订阅接口
 * 后端路由: /admin/webhook-subscriptions
 */
import request from './client';

export interface WebhookSubscription {
  id: string;
  organizationId: string;
  name: string;
  channel: 'wecom' | 'feishu' | 'plain';
  url: string;
  mobile?: string;
  active: boolean;
  createdBy: string;
  createdAt: string;
}

export const getWebhookSubscriptions = (): Promise<WebhookSubscription[]> =>
  request.get('/admin/webhook-subscriptions');

export const createWebhookSubscription = (payload: {
  name: string;
  channel: 'wecom' | 'feishu' | 'plain';
  url: string;
  mobile?: string;
}): Promise<WebhookSubscription> => request.post('/admin/webhook-subscriptions', payload);

export const updateWebhookSubscription = (id: string, payload: Partial<WebhookSubscription>): Promise<void> =>
  request.patch(`/admin/webhook-subscriptions/${id}`, payload);

export const deleteWebhookSubscription = (id: string): Promise<void> =>
  request.delete(`/admin/webhook-subscriptions/${id}`);

export const testWebhookSubscription = (id: string): Promise<void> =>
  request.post(`/admin/webhook-subscriptions/${id}/test`);

import React, { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Dropdown, Space, Dialog, Form, Input, MessagePlugin } from 'tdesign-react';
import { SettingIcon, PoweroffIcon, UserCircleIcon, NotificationIcon, LockOnIcon } from 'tdesign-icons-react';
import { useUiStore } from 'stores/useUiStore';
import { useAuthStore } from 'stores/useAuthStore';
import request from 'api/client';
import Style from './HeaderIcon.module.less';

const { FormItem } = Form;

const ROLE_LABEL: Record<string, string> = {
  platform_admin: '平台管理员',
  sub_admin: '选委会主任 (子管理)',
  editor: '经办编辑',
  reviewer: '审核人员',
  candidate: '参选人',
};

/**
 * 右上角身份与操作：
 * 身份显示「归属地（村/社区） · 角色 · 账号」；
 * 下拉菜单支持：修改登录密码、退出登录。
 */
export default memo(() => {
  const navigate = useNavigate();
  const toggleSetting = useUiStore((s) => s.toggleSetting);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  // 修改密码弹窗
  const [pwdVisible, setPwdVisible] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const orgTypeLabel = user?.orgType === 'community' ? '社区' : user?.orgType === 'village' ? '村' : '';
  const orgPart = user?.orgName ? `${user.orgName}${orgTypeLabel ? `（${orgTypeLabel}）` : ''}` : '城厢区工作台';
  const rolePart = user?.role ? (ROLE_LABEL[user.role] || user.role) : '工作人员';
  const phonePart = user?.phone || user?.name || '';
  const identity = user
    ? `${orgPart} · ${rolePart}${phonePart ? ` · ${phonePart}` : ''}`
    : '未登录';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) {
      MessagePlugin.warning('请填写原密码和新密码');
      return;
    }
    if (newPassword.length < 6) {
      MessagePlugin.warning('新密码长度不能少于 6 位');
      return;
    }
    if (newPassword !== confirmPassword) {
      MessagePlugin.warning('两次输入的新密码不一致');
      return;
    }
    setSubmitting(true);
    try {
      await request.post('/auth/change-password', {
        oldPassword,
        newPassword,
      });
      MessagePlugin.success('密码修改成功，请使用新密码重新登录');
      setPwdVisible(false);
      handleLogout();
    } catch (err: any) {
      MessagePlugin.error(err.message || '原密码校验错误或修改失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Space align="center">
      <Button
        className={Style.menuIcon}
        shape="square"
        size="large"
        variant="text"
        icon={<NotificationIcon />}
        onClick={() => navigate('/admin/notifications')}
      />
      <Dropdown
        trigger="click"
        options={[
          { content: '修改个人密码', prefixIcon: <LockOnIcon />, value: 'change_pwd' },
          { content: '退出系统登录', prefixIcon: <PoweroffIcon />, value: 'logout' },
        ]}
        onClick={(data: any) => {
          const val = data?.data?.value || data?.value;
          if (val === 'logout') handleLogout();
          if (val === 'change_pwd') {
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setPwdVisible(true);
          }
        }}
      >
        <Button variant="text" className={Style.dropdown}>
          <UserCircleIcon className={Style.icon} />
          <span className={Style.text}>{identity}</span>
        </Button>
      </Dropdown>
      <Button
        className={Style.menuIcon}
        shape="square"
        size="large"
        variant="text"
        icon={<SettingIcon />}
        onClick={toggleSetting}
      />

      {/* 修改密码 Dialog */}
      <Dialog
        header="修改个人工作台登录密码"
        visible={pwdVisible}
        onClose={() => setPwdVisible(false)}
        confirmBtn={{ content: '确认修改', theme: 'primary', loading: submitting }}
        onConfirm={handleChangePassword}
        width={460}
      >
        <Form labelWidth={100}>
          <FormItem label="当前账号">
            <Input value={user?.phone || ''} disabled />
          </FormItem>
          <FormItem label="原登录密码" requiredMark>
            <Input
              type="password"
              placeholder="请输入当前正在使用的密码"
              value={oldPassword}
              onChange={setOldPassword}
            />
          </FormItem>
          <FormItem label="新密码" requiredMark>
            <Input
              type="password"
              placeholder="请输入至少6位新密码"
              value={newPassword}
              onChange={setNewPassword}
            />
          </FormItem>
          <FormItem label="确认新密码" requiredMark>
            <Input
              type="password"
              placeholder="请再次输入新密码"
              value={confirmPassword}
              onChange={setConfirmPassword}
            />
          </FormItem>
        </Form>
      </Dialog>
    </Space>
  );
});

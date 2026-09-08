import path from 'path';
import fs from 'node:fs';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const CWD = process.cwd();

// 内联插件：把 `xxx.svg?component` 转成 React 组件（替代只支持 vite2 的 @honkhonk/vite-plugin-svgr，兼容 vite5，零新增依赖）
const svgAsComponent = {
  name: 'svg-as-component',
  enforce: 'pre',
  transform(_code, id) {
    if (!id.includes('.svg?component')) return null;
    const file = id.split('?')[0];
    const svg = fs.readFileSync(file, 'utf8');
    return {
      code: `import React from 'react';
const Svg=(props)=>React.createElement('span',Object.assign({style:{display:'inline-flex',lineHeight:0}},props,{dangerouslySetInnerHTML:{__html:${JSON.stringify(svg)}}}));
export default Svg;`,
      map: null,
    };
  },
};

export default (params) => {
  const { mode } = params;
  const env = loadEnv(mode, CWD);
  const { VITE_BASE_URL } = env;
  // 后端地址：优先 VITE_API_PROXY_TARGET，其次本地 DEPLOY_RUN_PORT/PORT，回退 3100
  const apiTarget =
    env.VITE_API_PROXY_TARGET ||
    `http://127.0.0.1:${process.env.DEPLOY_RUN_PORT || process.env.PORT || 3100}`;

  return {
    base: VITE_BASE_URL,
    resolve: {
      alias: {
        assets: path.resolve(__dirname, './src/assets'),
        api: path.resolve(__dirname, './src/api'),
        components: path.resolve(__dirname, './src/components'),
        configs: path.resolve(__dirname, './src/configs'),
        layouts: path.resolve(__dirname, './src/layouts'),
        modules: path.resolve(__dirname, './src/modules'),
        pages: path.resolve(__dirname, './src/pages'),
        plugins: path.resolve(__dirname, './src/plugins'),
        stores: path.resolve(__dirname, './src/stores'),
        styles: path.resolve(__dirname, './src/styles'),
        utils: path.resolve(__dirname, './src/utils'),
        router: path.resolve(__dirname, './src/router'),
        types: path.resolve(__dirname, './src/types'),
      },
    },

    css: {
      preprocessorOptions: {
        less: {
          modifyVars: {
            // 如需自定义组件其他 token, 在此处配置
          },
        },
      },
    },

    plugins: [
      svgAsComponent,
      react(),
    ],

    build: {
      cssCodeSplit: false,
      sourcemap: false,
    },

    optimizeDeps: {
      esbuildOptions: {
        sourcemap: false,
      },
    },

    preview: {
      host: '0.0.0.0',
      port: 3005,
    },
    server: {
      host: '0.0.0.0',
      port: 3003,
      sourcemapIgnoreList: () => true,
      // 本地开发同源代理：把后端 API/文件/认证路径转发到后端服务，
      // 前端代码统一用相对路径，生产环境由 Fastify 同源托管，dev/生产行为一致。
      proxy: {
        '/admin': { target: apiTarget, changeOrigin: true },
        '/files': { target: apiTarget, changeOrigin: true },
        '/auth': { target: apiTarget, changeOrigin: true },
        '/health': { target: apiTarget, changeOrigin: true },
      },
    },
  };
};

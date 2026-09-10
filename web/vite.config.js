import path from 'path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CWD = process.cwd();
const cdn = (p) => path.resolve(__dirname, 'src/cdn', p);

// 内联插件：把 `xxx.svg?component` 转成 React 组件（零新增依赖）
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

// [ENV-CONFIG] CDN 外部化（灾难版/差机减负）：开发模式把裸模块 import 重写为 window 全局变量
// 仅外部化「有稳定 UMD 且不被其他本地依赖引用」的包
// react/react-dom 走 src/cdn shim 单实例（见 alias），不在此列
// [^}]*? 防止跨行吞掉后续 import 语句
function rewriteCdnImport(code, pkg, globalVar) {
  const esc = pkg.replace('/', '\\/');
  code = code.replace(new RegExp(`import\\s+type\\s*\\{[^}]*?\\}\\s*from\\s*['"]${esc}['"];?`, 'g'), '');
  code = code.replace(new RegExp(`import\\s+(\\w+)\\s*,\\s*\\{([^}]*?)\\}\\s*from\\s*['"]${esc}['"];?`, 'g'), (_m, def, named) => {
    const names = named.split(',').map((s) => s.trim()).filter((s) => s && !/^type\s/.test(s));
    return `const ${def} = ${globalVar};` + (names.length ? ` const { ${names.join(', ')} } = ${globalVar};` : '');
  });
  code = code.replace(new RegExp(`import\\s*\\{([^}]*?)\\}\\s*from\\s*['"]${esc}['"];?`, 'g'), (_m, named) => {
    const names = named.split(',').map((s) => s.trim()).filter((s) => s && !/^type\s/.test(s));
    return names.length ? `const { ${names.join(', ')} } = ${globalVar};` : '';
  });
  code = code.replace(new RegExp(`import\\s+(\\w+)\\s+from\\s*['"]${esc}['"];?`, 'g'), `const $1 = ${globalVar};`);
  return code;
}

// CDN 包 → window 全局变量（与 index.html CDN script 一一对应）
const CDN_MAP = [
  ['tdesign-react', 'window.TDesign'],
  ['tdesign-icons-react', 'window.TDesignIconReact'],
  ['axios', 'window.axios'],
  ['classnames', 'window.classNames'],
];

const cdnExternal = {
  name: 'cdn-external',
  enforce: 'pre',
  transform(code, id) {
    if (!/\.(tsx?|jsx?)$/.test(id) || id.includes('node_modules')) return null;
    let out = code;
    out = out.replace(/import\s*['"]tdesign-react\/[^'"]+['"];?/g, '');
    for (const [pkg, gv] of CDN_MAP) out = rewriteCdnImport(out, pkg, gv);
    return out === code ? null : out;
  },
};

// react 系 → CDN 单实例 shim（长路径在前，避免前缀误匹配）
const reactAlias = [
  { find: 'react-dom/client', replacement: cdn('react-dom-client.js') },
  { find: 'react-dom', replacement: cdn('react-dom.js') },
  { find: 'react', replacement: cdn('react.js') },
];
const bizAlias = ['assets','api','components','configs','layouts','modules','pages','plugins','stores','styles','utils','router','types']
  .map((name) => ({ find: name, replacement: path.resolve(__dirname, `./src/${name}`) }));

export default (params) => {
  const { mode } = params;
  const { VITE_BASE_URL, VITE_API_BASE_URL } = loadEnv(mode, CWD);

  return {
    base: VITE_BASE_URL || '/',
    define: { __API_BASE_URL__: JSON.stringify(VITE_API_BASE_URL || '') },
    resolve: { alias: [...reactAlias, ...bizAlias] },
    css: { preprocessorOptions: { less: { modifyVars: {} } } },
    // classic runtime：JSX 编译为 React.createElement（CDN UMD 不提供 jsx-runtime，且 43/43 业务文件均已 import React）
    plugins: [cdnExternal, svgAsComponent, react({ jsxRuntime: 'classic' })],
    optimizeDeps: {
      // tdesign/axios/classnames 不参与本地预构建（差机减负核心：最大的 tdesign 不本地打包）
      exclude: CDN_MAP.map(([p]) => p),
      esbuildOptions: {
        sourcemap: false,
        // 依赖预构建时 react 系也指向 shim，避免内联本地 react 造成双实例
        alias: {
          'react-dom/client': cdn('react-dom-client.js'),
          'react-dom': cdn('react-dom.js'),
          react: cdn('react.js'),
        },
      },
    },
    build: {
      cssCodeSplit: false,
      sourcemap: false,
      rollupOptions: {
        external: ['react', 'react-dom', 'react-dom/client', ...CDN_MAP.map(([p]) => p)],
        output: {
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM',
            'react-dom/client': 'ReactDOM',
            'tdesign-react': 'TDesign',
            'tdesign-icons-react': 'TDesignIconReact',
            axios: 'axios',
            classnames: 'classNames',
          },
        },
      },
    },
    preview: { host: '0.0.0.0', port: 3005 },
    server: {
      host: '0.0.0.0',
      port: 3003,
      sourcemapIgnoreList: () => true,
      proxy: {
        '/auth': { target: 'http://127.0.0.1:3100', changeOrigin: true },
        '/admin': {
          target: 'http://127.0.0.1:3100',
          changeOrigin: true,
          bypass(req) {
            const accept = req.headers.accept || '';
            if (accept.includes('text/html') && req.method === 'GET') return '/index.html';
            return undefined;
          },
        },
        '/files': { target: 'http://127.0.0.1:3100', changeOrigin: true },
        '/candidate': { target: 'http://127.0.0.1:3100', changeOrigin: true },
      },
    },
  };
};

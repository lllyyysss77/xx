// [ENV-CONFIG] CDN 单实例 shim：业务源码与本地依赖(react-router-dom/zustand 等)统一取 window.React
// 避免「业务用 CDN React、依赖内联本地 React」的双实例导致 Context/hooks 失效白屏
const React = window.React;
export default React;
export const {
  Children, Component, Fragment, Profiler, PureComponent, StrictMode, Suspense,
  cloneElement, createContext, createElement, createFactory, createRef,
  forwardRef, isValidElement, lazy, memo, startTransition,
  useCallback, useContext, useDebugValue, useDeferredValue, useEffect, useId,
  useImperativeHandle, useInsertionEffect, useLayoutEffect, useMemo,
  useReducer, useRef, useState, useSyncExternalStore, useTransition, version,
} = React;

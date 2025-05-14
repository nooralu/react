/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */


export * from 'react-server-dom-webpack/src/server/ReactFlightServerConfigWebpackBundler';
export * from 'react-dom-bindings/src/server/ReactFlightServerConfigDOM';

// For now, we get this from the global scope, but this will likely move to a module.
export const supportsRequestStorage = typeof AsyncLocalStorage === 'function';
export const requestStorage =
  supportsRequestStorage ? new AsyncLocalStorage() : (null);

export const supportsComponentStorage =
  __DEV__ && supportsRequestStorage;
export const componentStorage =
  supportsComponentStorage ? new AsyncLocalStorage() : (null);

// We use the Node version but get access to async_hooks from a global.
export const createAsyncHook =
  typeof async_hooks === 'object'
    ? async_hooks.createHook
    : function () {
        return ({
          enable() {},
          disable() {},
        });
      };
export const executionAsyncId =
  typeof async_hooks === 'object' ? async_hooks.executionAsyncId : (null);

export * from '../ReactFlightServerConfigDebugNode';

export * from '../ReactFlightStackConfigV8';

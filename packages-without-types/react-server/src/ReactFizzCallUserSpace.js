/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */


// These indirections exists so we can exclude its stack frame in DEV (and anything below it).
// TODO: Consider marking the whole bundle instead of these boundaries.

const callComponent = {
  'react-stack-bottom-frame': function(
    Component,
    props,
    secondArg,
  ) {
    return Component(props, secondArg);
  },
};

export const callComponentInDEV = __DEV__
  ? // We use this technique to trick minifiers to preserve the function name.
    (callComponent['react-stack-bottom-frame'].bind(callComponent))
  : (null);


const callRender = {
  'react-stack-bottom-frame': function(instance) {
    return instance.render();
  },
};

export const callRenderInDEV =
  __DEV__
    ? // We use this technique to trick minifiers to preserve the function name.
      (callRender['react-stack-bottom-frame'].bind(callRender))
    : (null);

const callLazyInit = {
  'react-stack-bottom-frame': function (lazy) {
    const payload = lazy._payload;
    const init = lazy._init;
    return init(payload);
  },
};

export const callLazyInitInDEV = __DEV__
  ? // We use this technique to trick minifiers to preserve the function name.
    (callLazyInit['react-stack-bottom-frame'].bind(callLazyInit))
  : (null);

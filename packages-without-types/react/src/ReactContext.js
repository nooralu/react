/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */

import {
  REACT_PROVIDER_TYPE,
  REACT_CONSUMER_TYPE,
  REACT_CONTEXT_TYPE,
} from 'shared/ReactSymbols';

import {enableRenderableContext} from 'shared/ReactFeatureFlags';

export function createContext(defaultValue) {
  // TODO: Second argument used to be an optional `calculateChangedBits`
  // function. Warn to reserve for future use?

  const context = {
    $$typeof: REACT_CONTEXT_TYPE,
    // As a workaround to support multiple concurrent renderers, we categorize
    // some renderers as primary and others as secondary. We only expect
    // there to be two concurrent renderers at most: React Native (primary) and
    // Fabric (secondary); React DOM (primary) and React ART (secondary).
    // Secondary renderers store their context values on separate fields.
    _currentValue: defaultValue,
    _currentValue2: defaultValue,
    // Used to track how many concurrent renderers this context currently
    // supports within in a single renderer. Such as parallel server rendering.
    _threadCount: 0,
    // These are circular
    Provider: (null),
    Consumer: (null),
  };

  if (enableRenderableContext) {
    context.Provider = context;
    context.Consumer = {
      $$typeof: REACT_CONSUMER_TYPE,
      _context: context,
    };
  } else {
    (context).Provider = {
      $$typeof: REACT_PROVIDER_TYPE,
      _context: context,
    };
    if (__DEV__) {
      const Consumer = {
        $$typeof: REACT_CONTEXT_TYPE,
        _context: context,
      };
      Object.defineProperties(Consumer, {
        Provider: {
          get() {
            return context.Provider;
          },
          set(_Provider) {
            context.Provider = _Provider;
          },
        },
        _currentValue: {
          get() {
            return context._currentValue;
          },
          set(_currentValue) {
            context._currentValue = _currentValue;
          },
        },
        _currentValue2: {
          get() {
            return context._currentValue2;
          },
          set(_currentValue2) {
            context._currentValue2 = _currentValue2;
          },
        },
        _threadCount: {
          get() {
            return context._threadCount;
          },
          set(_threadCount) {
            context._threadCount = _threadCount;
          },
        },
        Consumer: {
          get() {
            return context.Consumer;
          },
        },
        displayName: {
          get() {
            return context.displayName;
          },
          set(displayName) {},
        },
      });
      (context).Consumer = Consumer;
    } else {
      (context).Consumer = context;
    }
  }

  if (__DEV__) {
    context._currentRenderer = null;
    context._currentRenderer2 = null;
  }

  return context;
}

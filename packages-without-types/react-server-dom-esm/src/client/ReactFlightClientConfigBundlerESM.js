/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */


 // Module root path

 // Module root path


import {prepareDestinationForModuleImpl} from 'react-client/src/ReactFlightClientConfig';


// eslint-disable-next-line no-unused-vars

// The reason this function needs to defined here in this file instead of just
// being exported directly from the WebpackDestination... file is because the
// ClientReferenceMetadata is opaque and we can't unwrap it there.
// This should get inlined and we could also just implement an unwrapping function
// though that risks it getting used in places it shouldn't be. This is unfortunate
// but currently it seems to be the best option we have.
export function prepareDestinationForModule(
  moduleLoading,
  nonce,
  metadata,
) {
  prepareDestinationForModuleImpl(moduleLoading, metadata[0], nonce);
}

export function resolveClientReference(
  bundlerConfig,
  metadata,
) {
  const baseURL = bundlerConfig;
  return {
    specifier: baseURL + metadata[0],
    name: metadata[1],
  };
}

export function resolveServerReference(
  config,
  id,
) {
  const baseURL = config;
  const idx = id.lastIndexOf('#');
  const exportName = id.slice(idx + 1);
  const fullURL = id.slice(0, idx);
  if (!fullURL.startsWith(baseURL)) {
    throw new Error(
      'Attempted to load a Server Reference outside the hosted root.',
    );
  }
  return {specifier: fullURL, name: exportName};
}

const asyncModuleCache = new Map();

export function preloadModule(
  metadata,
) {
  const existingPromise = asyncModuleCache.get(metadata.specifier);
  if (existingPromise) {
    if (existingPromise.status === 'fulfilled') {
      return null;
    }
    return existingPromise;
  } else {
    // $FlowFixMe[unsupported-syntax]
    const modulePromise = import(metadata.specifier);
    modulePromise.then(
      value => {
        const fulfilledThenable =
          (modulePromise);
        fulfilledThenable.status = 'fulfilled';
        fulfilledThenable.value = value;
      },
      reason => {
        const rejectedThenable = (modulePromise);
        rejectedThenable.status = 'rejected';
        rejectedThenable.reason = reason;
      },
    );
    asyncModuleCache.set(metadata.specifier, modulePromise);
    return modulePromise;
  }
}

export function requireModule(metadata) {
  let moduleExports;
  // We assume that preloadModule has been called before, which
  // should have added something to the module cache.
  const promise = asyncModuleCache.get(metadata.specifier);
  if (promise.status === 'fulfilled') {
    moduleExports = promise.value;
  } else {
    throw promise.reason;
  }
  return moduleExports[metadata.name];
}

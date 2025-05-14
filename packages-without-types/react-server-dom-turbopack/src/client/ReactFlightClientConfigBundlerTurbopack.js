/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */



import {
  ID,
  CHUNKS,
  NAME,
  isAsyncImport,
} from '../shared/ReactFlightImportMetadata';

import {prepareDestinationWithChunks} from 'react-client/src/ReactFlightClientConfig';

import {loadChunk} from 'react-client/src/ReactFlightClientConfig';





// eslint-disable-next-line no-unused-vars

// The reason this function needs to defined here in this file instead of just
// being exported directly from the TurbopackDestination... file is because the
// ClientReferenceMetadata is opaque and we can't unwrap it there.
// This should get inlined and we could also just implement an unwrapping function
// though that risks it getting used in places it shouldn't be. This is unfortunate
// but currently it seems to be the best option we have.
export function prepareDestinationForModule(
  moduleLoading,
  nonce,
  metadata,
) {
  prepareDestinationWithChunks(moduleLoading, metadata[CHUNKS], nonce);
}

export function resolveClientReference(
  bundlerConfig,
  metadata,
) {
  if (bundlerConfig) {
    const moduleExports = bundlerConfig[metadata[ID]];
    let resolvedModuleData = moduleExports && moduleExports[metadata[NAME]];
    let name;
    if (resolvedModuleData) {
      // The potentially aliased name.
      name = resolvedModuleData.name;
    } else {
      // If we don't have this specific name, we might have the full module.
      resolvedModuleData = moduleExports && moduleExports['*'];
      if (!resolvedModuleData) {
        throw new Error(
          'Could not find the module "' +
            metadata[ID] +
            '" in the React Server Consumer Manifest. ' +
            'This is probably a bug in the React Server Components bundler.',
        );
      }
      name = metadata[NAME];
    }
    if (isAsyncImport(metadata)) {
      return [
        resolvedModuleData.id,
        resolvedModuleData.chunks,
        name,
        1 /* async */,
      ];
    } else {
      return [resolvedModuleData.id, resolvedModuleData.chunks, name];
    }
  }
  return metadata;
}

export function resolveServerReference(
  bundlerConfig,
  id,
) {
  let name = '';
  let resolvedModuleData = bundlerConfig[id];
  if (resolvedModuleData) {
    // The potentially aliased name.
    name = resolvedModuleData.name;
  } else {
    // We didn't find this specific export name but we might have the * export
    // which contains this name as well.
    // TODO: It's unfortunate that we now have to parse this string. We should
    // probably go back to encoding path and name separately on the client reference.
    const idx = id.lastIndexOf('#');
    if (idx !== -1) {
      name = id.slice(idx + 1);
      resolvedModuleData = bundlerConfig[id.slice(0, idx)];
    }
    if (!resolvedModuleData) {
      throw new Error(
        'Could not find the module "' +
          id +
          '" in the React Server Manifest. ' +
          'This is probably a bug in the React Server Components bundler.',
      );
    }
  }
  // TODO: This needs to return async: true if it's an async module.
  return [resolvedModuleData.id, resolvedModuleData.chunks, name];
}

// The chunk cache contains all the chunks we've preloaded so far.
// If they're still pending they're a thenable. This map also exists
// in Turbopack but unfortunately it's not exposed so we have to
// replicate it in user space. null means that it has already loaded.
const chunkCache = new Map();

function requireAsyncModule(id) {
  // We've already loaded all the chunks. We can require the module.
  const promise = __turbopack_require__(id);
  if (typeof promise.then !== 'function') {
    // This wasn't a promise after all.
    return null;
  } else if (promise.status === 'fulfilled') {
    // This module was already resolved earlier.
    return null;
  } else {
    // Instrument the Promise to stash the result.
    promise.then(
      value => {
        const fulfilledThenable = (promise);
        fulfilledThenable.status = 'fulfilled';
        fulfilledThenable.value = value;
      },
      reason => {
        const rejectedThenable = (promise);
        rejectedThenable.status = 'rejected';
        rejectedThenable.reason = reason;
      },
    );
    return promise;
  }
}

function ignoreReject() {
  // We rely on rejected promises to be handled by another listener.
}
// Start preloading the modules since we might need them soon.
// This function doesn't suspend.
export function preloadModule(
  metadata,
) {
  const chunks = metadata[CHUNKS];
  const promises = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunkFilename = chunks[i];
    const entry = chunkCache.get(chunkFilename);
    if (entry === undefined) {
      const thenable = loadChunk(chunkFilename);
      promises.push(thenable);
      // $FlowFixMe[method-unbinding]
      const resolve = chunkCache.set.bind(chunkCache, chunkFilename, null);
      thenable.then(resolve, ignoreReject);
      chunkCache.set(chunkFilename, thenable);
    } else if (entry !== null) {
      promises.push(entry);
    }
  }
  if (isAsyncImport(metadata)) {
    if (promises.length === 0) {
      return requireAsyncModule(metadata[ID]);
    } else {
      return Promise.all(promises).then(() => {
        return requireAsyncModule(metadata[ID]);
      });
    }
  } else if (promises.length > 0) {
    return Promise.all(promises);
  } else {
    return null;
  }
}

// Actually require the module or suspend if it's not yet ready.
// Increase priority if necessary.
export function requireModule(metadata) {
  let moduleExports = __turbopack_require__(metadata[ID]);
  if (isAsyncImport(metadata)) {
    if (typeof moduleExports.then !== 'function') {
      // This wasn't a promise after all.
    } else if (moduleExports.status === 'fulfilled') {
      // This Promise should've been instrumented by preloadModule.
      moduleExports = moduleExports.value;
    } else {
      throw moduleExports.reason;
    }
  }
  if (metadata[NAME] === '*') {
    // This is a placeholder value that represents that the caller imported this
    // as a CommonJS module as is.
    return moduleExports;
  }
  if (metadata[NAME] === '') {
    // This is a placeholder value that represents that the caller accessed the
    // default property of this if it was an ESM interop module.
    return moduleExports.__esModule ? moduleExports.default : moduleExports;
  }
  return moduleExports[metadata[NAME]];
}

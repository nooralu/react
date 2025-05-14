/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */


import {
  createResponse,
  getRoot,
  reportGlobalError,
  processBinaryChunk,
  close,
  injectIntoDevTools,
} from 'react-client/src/ReactFlightClient';

import {
  processReply,
  createServerReference as createServerReferenceImpl,
} from 'react-client/src/ReactFlightReplyClient';

export {registerServerReference} from 'react-client/src/ReactFlightReplyClient';


export {createTemporaryReferenceSet} from 'react-client/src/ReactFlightTemporaryReferences';

function findSourceMapURL(filename, environmentName) {
  const devServer = parcelRequire.meta.devServer;
  if (devServer != null) {
    const qs = new URLSearchParams();
    qs.set('filename', filename);
    qs.set('env', environmentName);
    return devServer + '/__parcel_source_map?' + qs.toString();
  }
  return null;
}


let callServer = null;
export function setServerCallback(fn) {
  callServer = fn;
}

function callCurrentServerCallback(
  id,
  args,
) {
  if (!callServer) {
    throw new Error(
      'No server callback has been registered. Call setServerCallback to register one.',
    );
  }
  return callServer(id, args);
}

export function createServerReference(
  id,
  exportName,
) {
  return createServerReferenceImpl(
    id + '#' + exportName,
    callCurrentServerCallback,
    undefined,
    findSourceMapURL,
    exportName,
  );
}

function startReadingFromStream(
  response,
  stream,
) {
  const reader = stream.getReader();
  function progress({
    done,
    value,
  }) {
    if (done) {
      close(response);
      return;
    }
    const buffer = (value);
    processBinaryChunk(response, buffer);
    return reader.read().then(progress).catch(error);
  }
  function error(e) {
    reportGlobalError(response, e);
  }
  reader.read().then(progress).catch(error);
}


export function createFromReadableStream(
  stream,
  options,
) {
  const response = createResponse(
    null, // bundlerConfig
    null, // serverReferenceConfig
    null, // moduleLoading
    callCurrentServerCallback,
    undefined, // encodeFormAction
    undefined, // nonce
    options && options.temporaryReferences
      ? options.temporaryReferences
      : undefined,
    __DEV__ ? findSourceMapURL : undefined,
    __DEV__ ? (options ? options.replayConsoleLogs !== false : true) : false, // defaults to true
    __DEV__ && options && options.environmentName
      ? options.environmentName
      : undefined,
  );
  startReadingFromStream(response, stream);
  return getRoot(response);
}

export function createFromFetch(
  promiseForResponse,
  options,
) {
  const response = createResponse(
    null, // bundlerConfig
    null, // serverReferenceConfig
    null, // moduleLoading
    callCurrentServerCallback,
    undefined, // encodeFormAction
    undefined, // nonce
    options && options.temporaryReferences
      ? options.temporaryReferences
      : undefined,
    __DEV__ ? findSourceMapURL : undefined,
    __DEV__ ? (options ? options.replayConsoleLogs !== false : true) : false, // defaults to true
    __DEV__ && options && options.environmentName
      ? options.environmentName
      : undefined,
  );
  promiseForResponse.then(
    function (r) {
      startReadingFromStream(response, (r.body));
    },
    function (e) {
      reportGlobalError(response, e);
    },
  );
  return getRoot(response);
}

export function encodeReply(
  value,
  options,
) /* We don't use URLSearchParams yet but maybe */ {
  return new Promise((resolve, reject) => {
    const abort = processReply(
      value,
      '', // formFieldPrefix
      options && options.temporaryReferences
        ? options.temporaryReferences
        : undefined,
      resolve,
      reject,
    );
    if (options && options.signal) {
      const signal = options.signal;
      if (signal.aborted) {
        abort((signal).reason);
      } else {
        const listener = () => {
          abort((signal).reason);
          signal.removeEventListener('abort', listener);
        };
        signal.addEventListener('abort', listener);
      }
    }
  });
}

if (__DEV__) {
  injectIntoDevTools();
}

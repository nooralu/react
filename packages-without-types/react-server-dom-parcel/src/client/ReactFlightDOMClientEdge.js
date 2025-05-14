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

function noServerCall() {
  throw new Error(
    'Server Functions cannot be called during initial render. ' +
      'This would create a fetch waterfall. Try to use a Server Component ' +
      'to pass data to Client Components instead.',
  );
}

export function createServerReference(
  id,
  exportName,
) {
  return createServerReferenceImpl(
    id + '#' + exportName,
    noServerCall,
    undefined,
    findSourceMapURL,
    exportName,
  );
}



function createResponseFromOptions(options) {
  return createResponse(
    null, // bundlerConfig
    null, // serverReferenceConfig
    null, // moduleLoading
    noServerCall,
    options ? options.encodeFormAction : undefined,
    options && typeof options.nonce === 'string' ? options.nonce : undefined,
    options && options.temporaryReferences
      ? options.temporaryReferences
      : undefined,
    __DEV__ ? findSourceMapURL : undefined,
    __DEV__ && options ? options.replayConsoleLogs === true : false, // defaults to false
    __DEV__ && options && options.environmentName
      ? options.environmentName
      : undefined,
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
  const response = createResponseFromOptions(options);
  startReadingFromStream(response, stream);
  return getRoot(response);
}

export function createFromFetch(
  promiseForResponse,
  options,
) {
  const response = createResponseFromOptions(options);
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
      '',
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

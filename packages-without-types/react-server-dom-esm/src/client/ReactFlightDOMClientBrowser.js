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

import {processReply} from 'react-client/src/ReactFlightReplyClient';

export {
  createServerReference,
  registerServerReference,
} from 'react-client/src/ReactFlightReplyClient';


export {createTemporaryReferenceSet} from 'react-client/src/ReactFlightTemporaryReferences';




function createResponseFromOptions(options) {
  return createResponse(
    options && options.moduleBaseURL ? options.moduleBaseURL : '',
    null,
    null,
    options && options.callServer ? options.callServer : undefined,
    undefined, // encodeFormAction
    undefined, // nonce
    options && options.temporaryReferences
      ? options.temporaryReferences
      : undefined,
    __DEV__ && options && options.findSourceMapURL
      ? options.findSourceMapURL
      : undefined,
    __DEV__ ? (options ? options.replayConsoleLogs !== false : true) : false, // defaults to true
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

function createFromReadableStream(
  stream,
  options,
) {
  const response = createResponseFromOptions(options);
  startReadingFromStream(response, stream);
  return getRoot(response);
}

function createFromFetch(
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

function encodeReply(
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

export {createFromFetch, createFromReadableStream, encodeReply};

if (__DEV__) {
  injectIntoDevTools();
}

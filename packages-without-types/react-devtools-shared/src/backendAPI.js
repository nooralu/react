/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */

import {hydrate, fillInPath} from 'react-devtools-shared/src/hydration';
import {backendToFrontendSerializedElementMapper} from 'react-devtools-shared/src/utils';
import Store from 'react-devtools-shared/src/devtools/store';
import TimeoutError from 'react-devtools-shared/src/errors/TimeoutError';
import ElementPollingCancellationError from 'react-devtools-shared/src/errors/ElementPollingCancellationError';


export function clearErrorsAndWarnings({
  bridge,
  store,
}) {
  store.rootIDToRendererID.forEach(rendererID => {
    bridge.send('clearErrorsAndWarnings', {rendererID});
  });
}

export function clearErrorsForElement({
  bridge,
  id,
  rendererID,
}) {
  bridge.send('clearErrorsForElementID', {
    rendererID,
    id,
  });
}

export function clearWarningsForElement({
  bridge,
  id,
  rendererID,
}) {
  bridge.send('clearWarningsForElementID', {
    rendererID,
    id,
  });
}

export function copyInspectedElementPath({
  bridge,
  id,
  path,
  rendererID,
}) {
  bridge.send('copyElementPath', {
    id,
    path,
    rendererID,
  });
}

export function inspectElement(
  bridge,
  forceFullData,
  id,
  path,
  rendererID,
  shouldListenToPauseEvents = false,
) {
  const requestID = requestCounter++;
  const promise = getPromiseForRequestID(
    requestID,
    'inspectedElement',
    bridge,
    `Timed out while inspecting element ${id}.`,
    shouldListenToPauseEvents,
  );

  bridge.send('inspectElement', {
    forceFullData,
    id,
    path,
    rendererID,
    requestID,
  });

  return promise;
}

let storeAsGlobalCount = 0;

export function storeAsGlobal({
  bridge,
  id,
  path,
  rendererID,
}) {
  bridge.send('storeAsGlobal', {
    count: storeAsGlobalCount++,
    id,
    path,
    rendererID,
  });
}

const TIMEOUT_DELAY = 10_000;

let requestCounter = 0;

function getPromiseForRequestID(
  requestID,
  eventType,
  bridge,
  timeoutMessage,
  shouldListenToPauseEvents = false,
) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      bridge.removeListener(eventType, onInspectedElement);
      bridge.removeListener('shutdown', onShutdown);

      if (shouldListenToPauseEvents) {
        bridge.removeListener('pauseElementPolling', onDisconnect);
      }

      clearTimeout(timeoutID);
    };

    const onShutdown = () => {
      cleanup();
      reject(
        new Error(
          'Failed to inspect element. Try again or restart React DevTools.',
        ),
      );
    };

    const onDisconnect = () => {
      cleanup();
      reject(new ElementPollingCancellationError());
    };

    const onInspectedElement = (data) => {
      if (data.responseID === requestID) {
        cleanup();
        resolve((data));
      }
    };

    const onTimeout = () => {
      cleanup();
      reject(new TimeoutError(timeoutMessage));
    };

    bridge.addListener(eventType, onInspectedElement);
    bridge.addListener('shutdown', onShutdown);

    if (shouldListenToPauseEvents) {
      bridge.addListener('pauseElementPolling', onDisconnect);
    }

    const timeoutID = setTimeout(onTimeout, TIMEOUT_DELAY);
  });
}

export function cloneInspectedElementWithPath(
  inspectedElement,
  path,
  value,
) {
  const hydratedValue = hydrateHelper(value, path);
  const clonedInspectedElement = {...inspectedElement};

  fillInPath(clonedInspectedElement, value, path, hydratedValue);

  return clonedInspectedElement;
}

export function convertInspectedElementBackendToFrontend(
  inspectedElementBackend,
) {
  const {
    canEditFunctionProps,
    canEditFunctionPropsDeletePaths,
    canEditFunctionPropsRenamePaths,
    canEditHooks,
    canEditHooksAndDeletePaths,
    canEditHooksAndRenamePaths,
    canToggleError,
    isErrored,
    canToggleSuspense,
    canViewSource,
    hasLegacyContext,
    id,
    type,
    owners,
    source,
    context,
    hooks,
    plugins,
    props,
    rendererPackageName,
    rendererVersion,
    rootType,
    state,
    key,
    errors,
    warnings,
    nativeTag,
  } = inspectedElementBackend;

  const inspectedElement = {
    canEditFunctionProps,
    canEditFunctionPropsDeletePaths,
    canEditFunctionPropsRenamePaths,
    canEditHooks,
    canEditHooksAndDeletePaths,
    canEditHooksAndRenamePaths,
    canToggleError,
    isErrored,
    canToggleSuspense,
    canViewSource,
    hasLegacyContext,
    id,
    key,
    plugins,
    rendererPackageName,
    rendererVersion,
    rootType,
    // Previous backend implementations (<= 5.0.1) have a different interface for Source, with fileName.
    // This gates the source features for only compatible backends: >= 5.0.2
    source: source && source.sourceURL ? source : null,
    type,
    owners:
      owners === null
        ? null
        : owners.map(backendToFrontendSerializedElementMapper),
    context: hydrateHelper(context),
    hooks: hydrateHelper(hooks),
    props: hydrateHelper(props),
    state: hydrateHelper(state),
    errors,
    warnings,
    nativeTag,
  };

  return inspectedElement;
}

export function hydrateHelper(
  dehydratedData,
  path,
) {
  if (dehydratedData !== null) {
    const {cleaned, data, unserializable} = dehydratedData;

    if (path) {
      const {length} = path;
      if (length > 0) {
        // Hydration helper requires full paths, but inspection dehydrates with relative paths.
        // In that event it's important that we adjust the "cleaned" paths to match.
        return hydrate(
          data,
          cleaned.map(cleanedPath => cleanedPath.slice(length)),
          unserializable.map(unserializablePath =>
            unserializablePath.slice(length),
          ),
        );
      }
    }

    return hydrate(data, cleaned, unserializable);
  } else {
    return null;
  }
}

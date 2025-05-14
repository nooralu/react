/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */





import {
  isTransitionLane,
  isBlockingLane,
  isSyncLane,
  includesTransitionLane,
  includesBlockingLane,
  includesSyncLane,
} from './ReactFiberLane';

import {resolveEventType, resolveEventTimeStamp} from './ReactFiberConfig';

import {
  enableProfilerCommitHooks,
  enableProfilerNestedUpdatePhase,
  enableProfilerTimer,
  enableComponentPerformanceTrack,
} from 'shared/ReactFeatureFlags';

import {isAlreadyRendering} from './ReactFiberWorkLoop';

// Intentionally not named imports because Rollup would use dynamic dispatch for
// CommonJS interop named imports.
import * as Scheduler from 'scheduler';

const {unstable_now: now} = Scheduler;

const createTask =
  // eslint-disable-next-line react-internal/no-production-logging
  __DEV__ && console.createTask
    ? // eslint-disable-next-line react-internal/no-production-logging
      console.createTask
    : (name) => null;

export let renderStartTime = -0;
export let commitStartTime = -0;
export let commitEndTime = -0;
export let commitErrors = null;
export let profilerStartTime = -1.1;
export let profilerEffectDuration = -0;
export let componentEffectDuration = -0;
export let componentEffectStartTime = -1.1;
export let componentEffectEndTime = -1.1;
export let componentEffectErrors = null;

export let blockingClampTime = -0;
export let blockingUpdateTime = -1.1; // First sync setState scheduled.
export let blockingUpdateTask = null; // First sync setState's stack trace.
export let blockingEventTime = -1.1; // Event timeStamp of the first setState.
export let blockingEventType = null; // Event type of the first setState.
export let blockingEventIsRepeat = false;
export let blockingSpawnedUpdate = false;
export let blockingSuspendedTime = -1.1;
// TODO: This should really be one per Transition lane.
export let transitionClampTime = -0;
export let transitionStartTime = -1.1; // First startTransition call before setState.
export let transitionUpdateTime = -1.1; // First transition setState scheduled.
export let transitionUpdateTask = null; // First transition setState's stack trace.
export let transitionEventTime = -1.1; // Event timeStamp of the first transition.
export let transitionEventType = null; // Event type of the first transition.
export let transitionEventIsRepeat = false;
export let transitionSuspendedTime = -1.1;

export let yieldReason = (0);
export let yieldStartTime = -1.1; // The time when we yielded to the event loop

export function startYieldTimer(reason) {
  if (!enableProfilerTimer || !enableComponentPerformanceTrack) {
    return;
  }
  yieldStartTime = now();
  yieldReason = reason;
}

export function startUpdateTimerByLane(lane, method) {
  if (!enableProfilerTimer || !enableComponentPerformanceTrack) {
    return;
  }
  if (isSyncLane(lane) || isBlockingLane(lane)) {
    if (blockingUpdateTime < 0) {
      blockingUpdateTime = now();
      blockingUpdateTask = createTask(method);
      if (isAlreadyRendering()) {
        blockingSpawnedUpdate = true;
      }
      const newEventTime = resolveEventTimeStamp();
      const newEventType = resolveEventType();
      if (
        newEventTime !== blockingEventTime ||
        newEventType !== blockingEventType
      ) {
        blockingEventIsRepeat = false;
      } else if (newEventType !== null) {
        // If this is a second update in the same event, we treat it as a spawned update.
        // This might be a microtask spawned from useEffect, multiple flushSync or
        // a setState in a microtask spawned after the first setState. Regardless it's bad.
        blockingSpawnedUpdate = true;
      }
      blockingEventTime = newEventTime;
      blockingEventType = newEventType;
    }
  } else if (isTransitionLane(lane)) {
    if (transitionUpdateTime < 0) {
      transitionUpdateTime = now();
      transitionUpdateTask = createTask(method);
      if (transitionStartTime < 0) {
        const newEventTime = resolveEventTimeStamp();
        const newEventType = resolveEventType();
        if (
          newEventTime !== transitionEventTime ||
          newEventType !== transitionEventType
        ) {
          transitionEventIsRepeat = false;
        }
        transitionEventTime = newEventTime;
        transitionEventType = newEventType;
      }
    }
  }
}

export function startPingTimerByLanes(lanes) {
  if (!enableProfilerTimer || !enableComponentPerformanceTrack) {
    return;
  }
  // Mark the update time and clamp anything before it because we don't want
  // to show the event time for pings but we also don't want to clear it
  // because we still need to track if this was a repeat.
  if (includesSyncLane(lanes) || includesBlockingLane(lanes)) {
    if (blockingUpdateTime < 0) {
      blockingClampTime = blockingUpdateTime = now();
    }
  } else if (includesTransitionLane(lanes)) {
    if (transitionUpdateTime < 0) {
      transitionClampTime = transitionUpdateTime = now();
    }
  }
}

export function trackSuspendedTime(lanes, renderEndTime) {
  if (!enableProfilerTimer || !enableComponentPerformanceTrack) {
    return;
  }
  if (includesSyncLane(lanes) || includesBlockingLane(lanes)) {
    blockingSuspendedTime = renderEndTime;
  } else if (includesTransitionLane(lanes)) {
    transitionSuspendedTime = renderEndTime;
  }
}

export function clearBlockingTimers() {
  blockingUpdateTime = -1.1;
  blockingUpdateTask = null;
  blockingSuspendedTime = -1.1;
  blockingEventIsRepeat = true;
  blockingSpawnedUpdate = false;
}

export function startAsyncTransitionTimer() {
  if (!enableProfilerTimer || !enableComponentPerformanceTrack) {
    return;
  }
  if (transitionStartTime < 0 && transitionUpdateTime < 0) {
    transitionStartTime = now();
    const newEventTime = resolveEventTimeStamp();
    const newEventType = resolveEventType();
    if (
      newEventTime !== transitionEventTime ||
      newEventType !== transitionEventType
    ) {
      transitionEventIsRepeat = false;
    }
    transitionEventTime = newEventTime;
    transitionEventType = newEventType;
  }
}

export function hasScheduledTransitionWork() {
  // If we have setState on a transition or scheduled useActionState update.
  return transitionUpdateTime > -1;
}

// We use this marker to indicate that we have scheduled a render to be performed
// but it's not an explicit state update.
const ACTION_STATE_MARKER = -0.5;

export function startActionStateUpdate() {
  if (!enableProfilerTimer || !enableComponentPerformanceTrack) {
    return;
  }
  if (transitionUpdateTime < 0) {
    transitionUpdateTime = ACTION_STATE_MARKER;
    transitionUpdateTask = null;
  }
}

export function clearAsyncTransitionTimer() {
  transitionStartTime = -1.1;
}

export function clearTransitionTimers() {
  transitionStartTime = -1.1;
  transitionUpdateTime = -1.1;
  transitionUpdateTask = null;
  transitionSuspendedTime = -1.1;
  transitionEventIsRepeat = true;
}

export function clampBlockingTimers(finalTime) {
  if (!enableProfilerTimer || !enableComponentPerformanceTrack) {
    return;
  }
  // If we had new updates come in while we were still rendering or committing, we don't want
  // those update times to create overlapping tracks in the performance timeline so we clamp
  // them to the end of the commit phase.
  blockingClampTime = finalTime;
}

export function clampTransitionTimers(finalTime) {
  if (!enableProfilerTimer || !enableComponentPerformanceTrack) {
    return;
  }
  // If we had new updates come in while we were still rendering or committing, we don't want
  // those update times to create overlapping tracks in the performance timeline so we clamp
  // them to the end of the commit phase.
  transitionClampTime = finalTime;
}

export function pushNestedEffectDurations() {
  if (!enableProfilerTimer || !enableProfilerCommitHooks) {
    return 0;
  }
  const prevEffectDuration = profilerEffectDuration;
  profilerEffectDuration = 0; // Reset counter.
  return prevEffectDuration;
}

export function popNestedEffectDurations(prevEffectDuration) {
  if (!enableProfilerTimer || !enableProfilerCommitHooks) {
    return 0;
  }
  const elapsedTime = profilerEffectDuration;
  profilerEffectDuration = prevEffectDuration;
  return elapsedTime;
}

// Like pop but it also adds the current elapsed time to the parent scope.
export function bubbleNestedEffectDurations(
  prevEffectDuration,
) {
  if (!enableProfilerTimer || !enableProfilerCommitHooks) {
    return 0;
  }
  const elapsedTime = profilerEffectDuration;
  profilerEffectDuration += prevEffectDuration;
  return elapsedTime;
}

export function resetComponentEffectTimers() {
  if (!enableProfilerTimer || !enableProfilerCommitHooks) {
    return;
  }
  componentEffectStartTime = -1.1;
  componentEffectEndTime = -1.1;
}

export function pushComponentEffectStart() {
  if (!enableProfilerTimer || !enableProfilerCommitHooks) {
    return 0;
  }
  const prevEffectStart = componentEffectStartTime;
  componentEffectStartTime = -1.1; // Track the next start.
  return prevEffectStart;
}

export function popComponentEffectStart(prevEffectStart) {
  if (!enableProfilerTimer || !enableProfilerCommitHooks) {
    return;
  }
  // If the parent component didn't have a start time, we let this current time persist.
  if (prevEffectStart >= 0) {
    // Otherwise, we restore the previous parent's start time.
    componentEffectStartTime = prevEffectStart;
  }
}

export function pushComponentEffectDuration() {
  if (!enableProfilerTimer || !enableProfilerCommitHooks) {
    return 0;
  }
  const prevEffectDuration = componentEffectDuration;
  componentEffectDuration = -0; // Reset component level duration.
  return prevEffectDuration;
}

export function popComponentEffectDuration(prevEffectDuration) {
  if (!enableProfilerTimer || !enableProfilerCommitHooks) {
    return;
  }
  // If the parent component didn't have a start time, we let this current time persist.
  if (prevEffectDuration >= 0) {
    // Otherwise, we restore the previous parent's start time.
    componentEffectDuration = prevEffectDuration;
  }
}

export function pushComponentEffectErrors() {
  if (!enableProfilerTimer || !enableProfilerCommitHooks) {
    return null;
  }
  const prevErrors = componentEffectErrors;
  componentEffectErrors = null;
  return prevErrors;
}

export function popComponentEffectErrors(
  prevErrors,
) {
  if (!enableProfilerTimer || !enableProfilerCommitHooks) {
    return;
  }
  componentEffectErrors = prevErrors;
}

/**
 * Tracks whether the current update was a nested/cascading update (scheduled from a layout effect).
 *
 * The overall sequence is:
 *   1. render
 *   2. commit (and call `onRender`, `onCommit`)
 *   3. check for nested updates
 *   4. flush passive effects (and call `onPostCommit`)
 *
 * Nested updates are identified in step 3 above,
 * but step 4 still applies to the work that was just committed.
 * We use two flags to track nested updates then:
 * one tracks whether the upcoming update is a nested update,
 * and the other tracks whether the current update was a nested update.
 * The first value gets synced to the second at the start of the render phase.
 */
let currentUpdateIsNested = false;
let nestedUpdateScheduled = false;

export function isCurrentUpdateNested() {
  return currentUpdateIsNested;
}

export function markNestedUpdateScheduled() {
  if (enableProfilerNestedUpdatePhase) {
    nestedUpdateScheduled = true;
  }
}

export function resetNestedUpdateFlag() {
  if (enableProfilerNestedUpdatePhase) {
    currentUpdateIsNested = false;
    nestedUpdateScheduled = false;
  }
}

export function syncNestedUpdateFlag() {
  if (enableProfilerNestedUpdatePhase) {
    currentUpdateIsNested = nestedUpdateScheduled;
    nestedUpdateScheduled = false;
  }
}

export function recordRenderTime() {
  if (!enableProfilerTimer || !enableComponentPerformanceTrack) {
    return;
  }
  renderStartTime = now();
}

export function recordCommitTime() {
  if (!enableProfilerTimer) {
    return;
  }
  commitStartTime = now();
}

export function recordCommitEndTime() {
  if (!enableProfilerTimer) {
    return;
  }
  commitEndTime = now();
}

export function startProfilerTimer(fiber) {
  if (!enableProfilerTimer) {
    return;
  }

  profilerStartTime = now();

  if (((fiber.actualStartTime)) < 0) {
    fiber.actualStartTime = profilerStartTime;
  }
}

export function stopProfilerTimerIfRunning(fiber) {
  if (!enableProfilerTimer) {
    return;
  }
  profilerStartTime = -1;
}

export function stopProfilerTimerIfRunningAndRecordDuration(
  fiber,
) {
  if (!enableProfilerTimer) {
    return;
  }

  if (profilerStartTime >= 0) {
    const elapsedTime = now() - profilerStartTime;
    fiber.actualDuration += elapsedTime;
    fiber.selfBaseDuration = elapsedTime;
    profilerStartTime = -1;
  }
}

export function stopProfilerTimerIfRunningAndRecordIncompleteDuration(
  fiber,
) {
  if (!enableProfilerTimer) {
    return;
  }

  if (profilerStartTime >= 0) {
    const elapsedTime = now() - profilerStartTime;
    fiber.actualDuration += elapsedTime;
    // We don't update the selfBaseDuration here because we errored.
    profilerStartTime = -1;
  }
}

export function recordEffectDuration(fiber) {
  if (!enableProfilerTimer || !enableProfilerCommitHooks) {
    return;
  }

  if (profilerStartTime >= 0) {
    const endTime = now();
    const elapsedTime = endTime - profilerStartTime;

    profilerStartTime = -1;

    // Store duration on the next nearest Profiler ancestor
    // Or the root (for the DevTools Profiler to read)
    profilerEffectDuration += elapsedTime;
    componentEffectDuration += elapsedTime;

    // Keep track of the last end time of the effects.
    componentEffectEndTime = endTime;
  }
}

export function recordEffectError(errorInfo) {
  if (!enableProfilerTimer || !enableProfilerCommitHooks) {
    return;
  }
  if (componentEffectErrors === null) {
    componentEffectErrors = [];
  }
  componentEffectErrors.push(errorInfo);
  if (commitErrors === null) {
    commitErrors = [];
  }
  commitErrors.push(errorInfo);
}

export function resetCommitErrors() {
  commitErrors = null;
}

export function startEffectTimer() {
  if (!enableProfilerTimer || !enableProfilerCommitHooks) {
    return;
  }
  profilerStartTime = now();
  if (componentEffectStartTime < 0) {
    // Keep track of the first time we start an effect as the component's effect start time.
    componentEffectStartTime = profilerStartTime;
  }
}

export function transferActualDuration(fiber) {
  // Transfer time spent rendering these children so we don't lose it
  // after we rerender. This is used as a helper in special cases
  // where we should count the work of multiple passes.
  let child = fiber.child;
  while (child) {
    // $FlowFixMe[unsafe-addition] addition with possible null/undefined value
    fiber.actualDuration += child.actualDuration;
    child = child.sibling;
  }
}

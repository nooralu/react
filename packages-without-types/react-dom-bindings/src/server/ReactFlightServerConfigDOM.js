/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */


// This module registers the host dispatcher so it needs to be imported
// but it does not have any exports
import './ReactDOMFlightServerHostDispatcher';

// We use zero to represent the absence of an explicit precedence because it is
// small, smaller than how we encode undefined, and is unambiguous. We could use
// a different tuple structure to encode this instead but this makes the runtime
// cost cheaper by eliminating a type checks in more positions.

// prettier-ignore



export function createHints() {
  return new Set();
}

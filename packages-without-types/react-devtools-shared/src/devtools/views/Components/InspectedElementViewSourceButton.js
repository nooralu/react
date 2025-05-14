/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 */

import * as React from 'react';

import ButtonIcon from '../ButtonIcon';
import Button from '../Button';
import ViewElementSourceContext from './ViewElementSourceContext';
import Skeleton from './Skeleton';


const {useCallback, useContext} = React;


function InspectedElementViewSourceButton({
  canViewSource,
  source,
  symbolicatedSourcePromise,
}) {
  const {canViewElementSourceFunction, viewElementSourceFunction} = useContext(
    ViewElementSourceContext,
  );

  return (
    <React.Suspense fallback={<Skeleton height={16} width={24} />}>
      <ActualSourceButton
        canViewSource={canViewSource}
        source={source}
        symbolicatedSourcePromise={symbolicatedSourcePromise}
        canViewElementSourceFunction={canViewElementSourceFunction}
        viewElementSourceFunction={viewElementSourceFunction}
      />
    </React.Suspense>
  );
}

function ActualSourceButton({
  canViewSource,
  source,
  symbolicatedSourcePromise,
  canViewElementSourceFunction,
  viewElementSourceFunction,
}) {
  const symbolicatedSource =
    symbolicatedSourcePromise == null
      ? null
      : React.use(symbolicatedSourcePromise);

  // In some cases (e.g. FB internal usage) the standalone shell might not be able to view the source.
  // To detect this case, we defer to an injected helper function (if present).
  const buttonIsEnabled =
    !!canViewSource &&
    viewElementSourceFunction != null &&
    source != null &&
    (canViewElementSourceFunction == null ||
      canViewElementSourceFunction(source, symbolicatedSource));

  const viewSource = useCallback(() => {
    if (viewElementSourceFunction != null && source != null) {
      viewElementSourceFunction(source, symbolicatedSource);
    }
  }, [source, symbolicatedSource]);

  return (
    <Button
      disabled={!buttonIsEnabled}
      onClick={viewSource}
      title="View source for this element">
      <ButtonIcon type="view-source" />
    </Button>
  );
}

export default InspectedElementViewSourceButton;

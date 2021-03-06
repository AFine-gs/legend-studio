/**
 * Copyright (c) 2020-present, Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { hashArray } from '@finos/legend-studio-shared';
import type { Hashable } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../MetaModelConst';
import { V1_PositionedRectangle } from './geometry/V1_PositionedRectangle';

export class V1_ClassView extends V1_PositionedRectangle implements Hashable {
  id!: string;
  class!: string;
  hideProperties?: boolean;
  hideTaggedValues?: boolean;
  hideStereotypes?: boolean;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.CLASS_VIEW,
      super.hashCode,
      this.id,
      this.class,
      Boolean(this.hideProperties).toString(),
      Boolean(this.hideTaggedValues).toString(),
      Boolean(this.hideStereotypes).toString(),
    ]);
  }
}

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

import { action, makeObservable, observable } from 'mobx';
import type {
  LegendDataCubeApplicationStore,
  LegendDataCubeBaseStore,
} from '../LegendDataCubeBaseStore.js';
import {
  type DataCubeAlertService,
  type DataCubeAPI,
  type DataCubeLayoutService,
  type DataCubeTaskService,
  DataCubeQuery,
  DEFAULT_ALERT_WINDOW_CONFIG,
  type DisplayState,
} from '@finos/legend-data-cube';
import { LegendDataCubeNewQueryState } from './LegendDataCubeNewQueryState.js';
import {
  PersistentDataCubeQuery,
  type V1_EngineServerClient,
  type V1_PureGraphManager,
} from '@finos/legend-graph';
import {
  ActionState,
  assertErrorThrown,
  formatDate,
  isString,
  uuid,
} from '@finos/legend-shared';
import type { LegendDataCubeDataCubeEngine } from '../LegendDataCubeDataCubeEngine.js';
import { LegendDataCubeQuerySaver } from '../../components/query-builder/LegendDataCubeQuerySaver.js';
import {
  generateQueryBuilderRoute,
  LEGEND_DATA_CUBE_ROUTE_PATTERN_TOKEN,
} from '../../__lib__/LegendDataCubeNavigation.js';
import { LegendDataCubeQueryLoaderState } from './LegendDataCubeQueryLoaderState.js';
import {
  LegendDataCubeUserDataKey,
  RECENTLY_VIEWED_QUERIES_LIMIT,
} from '../../__lib__/LegendDataCubeUserData.js';
import type { DepotServerClient } from '@finos/legend-server-depot';

export class LegendDataCubeQueryBuilderState {
  uuid = uuid();
  startTime = Date.now();
  query!: DataCubeQuery;
  persistentQuery?: PersistentDataCubeQuery | undefined;
  dataCube?: DataCubeAPI | undefined;

  constructor(
    query: DataCubeQuery,
    persistentQuery?: PersistentDataCubeQuery | undefined,
  ) {
    makeObservable(this, {
      dataCube: observable,
      setDataCube: action,

      query: observable,
      persistentQuery: observable,
    });

    this.query = query;
    this.persistentQuery = persistentQuery;
  }

  setDataCube(val: DataCubeAPI | undefined) {
    this.dataCube = val;
  }
}

export class LegendDataCubeQueryBuilderStore {
  readonly application: LegendDataCubeApplicationStore;
  readonly baseStore: LegendDataCubeBaseStore;
  readonly engine: LegendDataCubeDataCubeEngine;
  readonly depotServerClient: DepotServerClient;
  readonly engineServerClient: V1_EngineServerClient;
  readonly graphManager: V1_PureGraphManager;
  readonly taskService: DataCubeTaskService;
  readonly layoutService: DataCubeLayoutService;
  readonly alertService: DataCubeAlertService;

  readonly newQueryState: LegendDataCubeNewQueryState;

  readonly saveQueryState = ActionState.create();
  readonly saverDisplay: DisplayState;

  readonly loadQueryState = ActionState.create();
  loader: LegendDataCubeQueryLoaderState;
  builder?: LegendDataCubeQueryBuilderState | undefined;

  constructor(baseStore: LegendDataCubeBaseStore) {
    makeObservable(this, {
      builder: observable,
      setBuilder: action,
    });

    this.application = baseStore.application;
    this.baseStore = baseStore;
    this.engine = baseStore.engine;
    this.depotServerClient = baseStore.depotServerClient;
    this.engineServerClient = baseStore.engineServerClient;
    this.graphManager = baseStore.graphManager;
    this.taskService = baseStore.taskService;
    this.alertService = baseStore.alertService;
    this.layoutService = baseStore.layoutService;

    this.newQueryState = new LegendDataCubeNewQueryState(this);
    this.loader = new LegendDataCubeQueryLoaderState(this);
    this.saverDisplay = this.layoutService.newDisplay(
      'Save Query',
      () => <LegendDataCubeQuerySaver />,
      {
        ...DEFAULT_ALERT_WINDOW_CONFIG,
        height: 140,
      },
    );
  }

  setBuilder(val: LegendDataCubeQueryBuilderState | undefined) {
    this.builder = val;
  }

  private updateWindowTitle(persistentQuery: PersistentDataCubeQuery) {
    this.application.layoutService.setWindowTitle(
      `\u229E ${persistentQuery.name}${this.builder ? ` - ${formatDate(new Date(this.builder.startTime), 'HH:mm:ss EEE MMM dd yyyy')}` : ''}`,
    );
  }

  getRecentlyViewedQueries() {
    const data = this.application.userDataService.getObjectValue(
      LegendDataCubeUserDataKey.RECENTLY_VIEWED_QUERIES,
    );
    return data && Array.isArray(data) && data.every((id) => isString(id))
      ? data
      : [];
  }

  async loadQuery(queryId: string | undefined) {
    // internalize the parameters and clean them from the URL
    const sourceData =
      this.application.navigationService.navigator.getCurrentLocationParameterValue(
        LEGEND_DATA_CUBE_ROUTE_PATTERN_TOKEN.SOURCE_DATA,
      );
    if (sourceData && !queryId) {
      this.application.navigationService.navigator.updateCurrentLocation(
        generateQueryBuilderRoute(null),
      );
      // populate the new query state if source data is specified
      try {
        await this.newQueryState.finalize(JSON.parse(atob(sourceData)));
      } catch (error) {
        assertErrorThrown(error);
        this.alertService.alertError(error, {
          message: `Query Creation Failure: Can't materialize query source from source data. Error: ${error.message}`,
        });
        this.setBuilder(undefined);
      }
    }

    if (queryId !== this.builder?.persistentQuery?.id) {
      if (!queryId) {
        this.setBuilder(undefined);
        this.loader.display.open();
        return;
      }

      this.loadQueryState.inProgress();

      try {
        const persistentQuery =
          await this.baseStore.graphManager.getDataCubeQuery(queryId);
        const query = DataCubeQuery.serialization.fromJson(
          persistentQuery.content,
        );
        this.setBuilder(
          new LegendDataCubeQueryBuilderState(query, persistentQuery),
        );
        this.updateWindowTitle(persistentQuery);

        // update the list of stack of recently viewed queries
        const recentlyViewedQueries = this.getRecentlyViewedQueries();
        const idx = recentlyViewedQueries.findIndex((data) => data === queryId);
        if (idx === -1) {
          if (recentlyViewedQueries.length >= RECENTLY_VIEWED_QUERIES_LIMIT) {
            recentlyViewedQueries.pop();
          }
          recentlyViewedQueries.unshift(queryId);
        } else {
          recentlyViewedQueries.splice(idx, 1);
          recentlyViewedQueries.unshift(queryId);
        }
        this.application.userDataService.persistValue(
          LegendDataCubeUserDataKey.RECENTLY_VIEWED_QUERIES,
          recentlyViewedQueries,
        );

        this.loadQueryState.pass();
      } catch (error) {
        assertErrorThrown(error);
        this.alertService.alertError(error, {
          message: `Query Load Failure: ${error.message}`,
        });
        this.loadQueryState.fail();
      }
    }
  }

  private async generatePersistentQuery(
    api: DataCubeAPI,
    name: string,
    existingPersistentQuery?: PersistentDataCubeQuery | undefined,
  ) {
    const query = await api.generateDataCubeQuery();
    let persistentQuery: PersistentDataCubeQuery;
    if (existingPersistentQuery) {
      persistentQuery = existingPersistentQuery.clone();
    } else {
      persistentQuery = new PersistentDataCubeQuery();
      persistentQuery.id = uuid();
    }
    persistentQuery.name = name;
    persistentQuery.content = DataCubeQuery.serialization.toJson(query);
    return persistentQuery;
  }

  async createQuery(name: string) {
    if (!this.builder?.dataCube || this.saveQueryState.isInProgress) {
      return;
    }

    this.saveQueryState.inProgress();
    try {
      const persistentQuery = await this.generatePersistentQuery(
        this.builder.dataCube,
        name,
      );

      const newQuery =
        await this.baseStore.graphManager.createDataCubeQuery(persistentQuery);
      // NOTE: reload is the cleanest, least bug-prone handling here
      // but we can opt for just updating the URL to reflect the new query
      // as an optimization. Also, it helps preserve the edition history
      // on the existing data-cube.
      //
      // Another way to avoid reloading the whole app it to force update
      // the <DataCube/> component using the key prop that ties to an ID
      // of the builder.
      this.application.navigationService.navigator.updateCurrentLocation(
        generateQueryBuilderRoute(newQuery.id),
      );
      this.updateWindowTitle(persistentQuery);

      this.saverDisplay.close();
      this.saveQueryState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.alertService.alertError(error, {
        message: `Query Creation Failure: ${error.message}`,
      });
      this.saveQueryState.fail();
    }
  }

  async saveQuery(name: string, saveAsNewQuery: boolean) {
    if (!this.builder?.dataCube || this.saveQueryState.isInProgress) {
      return;
    }

    this.saveQueryState.inProgress();
    try {
      const persistentQuery = await this.generatePersistentQuery(
        this.builder.dataCube,
        name,
        this.builder.persistentQuery,
      );

      if (saveAsNewQuery) {
        persistentQuery.id = uuid();
        const newQuery =
          await this.baseStore.graphManager.createDataCubeQuery(
            persistentQuery,
          );
        // NOTE: reload is the cleanest, least bug-prone handling here
        // but we can opt for just updating the URL to reflect the new query
        // as an optimization. Also, it helps preserve the edition history
        // on the existing data-cube.
        //
        // Another way to avoid reloading the whole app it to force update
        // the <DataCube/> component using the key prop that ties to an ID
        // of the builder.
        this.application.navigationService.navigator.updateCurrentLocation(
          generateQueryBuilderRoute(newQuery.id),
        );
      } else {
        await this.baseStore.graphManager.updateDataCubeQuery(persistentQuery);
      }
      this.updateWindowTitle(persistentQuery);

      this.saverDisplay.close();
      this.saveQueryState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.alertService.alertError(error, {
        message: `Query Update Failure: ${error.message}`,
      });
      this.saveQueryState.fail();
    }
  }
}

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

import {
  alias,
  createModelSchema,
  deserialize,
  custom,
  serialize,
  primitive,
  list,
  optional,
} from 'serializr';
import type { PlainObject } from '@finos/legend-studio-shared';
import {
  usingConstantValueSchema,
  getClass,
  IllegalStateError,
  UnsupportedOperationError,
} from '@finos/legend-studio-shared';
import { V1_ModelChainConnection } from '../../../model/packageableElements/store/modelToModel/connection/V1_ModelChainConnection';
import { V1_PackageableConnection } from '../../../model/packageableElements/connection/V1_PackageableConnection';
import type { V1_Connection } from '../../../model/packageableElements/connection/V1_Connection';
import { V1_JsonModelConnection } from '../../../model/packageableElements/store/modelToModel/connection/V1_JsonModelConnection';
import { V1_XmlModelConnection } from '../../../model/packageableElements/store/modelToModel/connection/V1_XmlModelConnection';
import { V1_FlatDataConnection } from '../../../model/packageableElements/store/flatData/connection/V1_FlatDataConnection';
import { V1_RelationalDatabaseConnection } from '../../../model/packageableElements/store/relational/connection/V1_RelationalDatabaseConnection';
import type { V1_DatasourceSpecification } from '../../../model/packageableElements/store/relational/connection/V1_DatasourceSpecification';
import {
  V1_SnowflakeDatasourceSpecification,
  V1_StaticDatasourceSpecification,
  V1_EmbeddedH2DatasourceSpecification,
} from '../../../model/packageableElements/store/relational/connection/V1_DatasourceSpecification';
import type { V1_AuthenticationStrategy } from '../../../model/packageableElements/store/relational/connection/V1_AuthenticationStrategy';
import {
  V1_OAuthAuthenticationStrategy,
  V1_DefaultH2AuthenticationStrategy,
  V1_DelegatedKerberosAuthenticationStrategy,
  V1_TestDatabaseAuthenticationStrategy,
} from '../../../model/packageableElements/store/relational/connection/V1_AuthenticationStrategy';
import type { PureProtocolProcessorPlugin } from '../../../../PureProtocolProcessorPlugin';
import type { StoreRelational_PureProtocolProcessorPlugin_Extension } from '../../../../StoreRelational_PureProtocolProcessorPlugin_Extension';
import { V1_ConnectionPointer } from '../../../model/packageableElements/connection/V1_ConnectionPointer';

export const V1_PACKAGEABLE_CONNECTION_ELEMENT_PROTOCOL_TYPE = 'connection';

export enum V1_ConnectionType {
  CONNECTION_POINTER = 'connectionPointer',
  // MODEL_CONNECTION = 'ModelConnection',
  MODEL_CHAIN_CONNECTION = 'ModelChainConnection',
  JSON_MODEL_CONNECTION = 'JsonModelConnection',
  XML_MODEL_CONNECTION = 'XmlModelConnection',
  FLAT_DATA_CONNECTION = 'FlatDataConnection',
  RELATIONAL_DATABASE_CONNECTION = 'RelationalDatabaseConnection',
}

export const V1_connectionPointerModelSchema = createModelSchema(
  V1_ConnectionPointer,
  {
    _type: usingConstantValueSchema(V1_ConnectionType.CONNECTION_POINTER),
    connection: primitive(),
  },
);

export const V1_modelChainConnectionModelSchema = createModelSchema(
  V1_ModelChainConnection,
  {
    _type: usingConstantValueSchema(V1_ConnectionType.MODEL_CHAIN_CONNECTION),
    store: alias('element', primitive()),
    mappings: list(primitive()),
  },
);

export const V1_jsonModelConnectionModelSchema = createModelSchema(
  V1_JsonModelConnection,
  {
    _type: usingConstantValueSchema(V1_ConnectionType.JSON_MODEL_CONNECTION),
    class: primitive(),
    store: alias('element', primitive()),
    url: primitive(),
  },
);

export const V1_xmlModelConnectionModelSchema = createModelSchema(
  V1_XmlModelConnection,
  {
    _type: usingConstantValueSchema(V1_ConnectionType.XML_MODEL_CONNECTION),
    class: primitive(),
    store: alias('element', primitive()),
    url: primitive(),
  },
);

export const V1_flatDataConnectionModelSchema = createModelSchema(
  V1_FlatDataConnection,
  {
    _type: usingConstantValueSchema(V1_ConnectionType.FLAT_DATA_CONNECTION),
    store: alias('element', primitive()),
    url: primitive(),
  },
);

// ---------------------------------------- Datasource specification ----------------------------------------

enum V1_DatasourceSpecificationType {
  STATIC = 'static',
  H2_EMBEDDED = 'h2Embedded',
  SNOWFLAKE = 'snowflake',
}

const staticDatasourceSpecificationModelSchema = createModelSchema(
  V1_StaticDatasourceSpecification,
  {
    _type: usingConstantValueSchema(V1_DatasourceSpecificationType.STATIC),
    databaseName: primitive(),
    host: primitive(),
    port: primitive(),
  },
);

const embeddedH2DatasourceSpecificationModelSchema = createModelSchema(
  V1_EmbeddedH2DatasourceSpecification,
  {
    _type: usingConstantValueSchema(V1_DatasourceSpecificationType.H2_EMBEDDED),
    autoServerMode: primitive(),
    databaseName: primitive(),
    directory: primitive(),
  },
);

const snowflakeDatasourceSpecificationModelSchema = createModelSchema(
  V1_SnowflakeDatasourceSpecification,
  {
    _type: usingConstantValueSchema(V1_DatasourceSpecificationType.SNOWFLAKE),
    accountName: primitive(),
    databaseName: primitive(),
    region: primitive(),
    warehouseName: primitive(),
  },
);

export const V1_serializeDatasourceSpecification = (
  protocol: V1_DatasourceSpecification,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_DatasourceSpecification> => {
  if (protocol instanceof V1_StaticDatasourceSpecification) {
    return serialize(staticDatasourceSpecificationModelSchema, protocol);
  } else if (protocol instanceof V1_EmbeddedH2DatasourceSpecification) {
    return serialize(embeddedH2DatasourceSpecificationModelSchema, protocol);
  } else if (protocol instanceof V1_SnowflakeDatasourceSpecification) {
    return serialize(snowflakeDatasourceSpecificationModelSchema, protocol);
  }
  const extraConnectionDatasourceSpecificationProtocolSerializers = plugins.flatMap(
    (plugin) =>
      (plugin as StoreRelational_PureProtocolProcessorPlugin_Extension).V1_getExtraConnectionDatasourceSpecificationProtocolSerializers?.() ??
      [],
  );
  for (const serializer of extraConnectionDatasourceSpecificationProtocolSerializers) {
    const json = serializer(protocol);
    if (json) {
      return json;
    }
  }
  throw new UnsupportedOperationError(
    `Can't serialize datasource specification of type '${
      getClass(protocol).name
    }'. No compatible serializer available from plugins.`,
  );
};

export const V1_deserializeDatasourceSpecification = (
  json: PlainObject<V1_DatasourceSpecification>,
  plugins: PureProtocolProcessorPlugin[],
): V1_DatasourceSpecification => {
  switch (json._type) {
    case V1_DatasourceSpecificationType.STATIC:
      return deserialize(staticDatasourceSpecificationModelSchema, json);
    case V1_DatasourceSpecificationType.H2_EMBEDDED:
      return deserialize(embeddedH2DatasourceSpecificationModelSchema, json);
    case V1_DatasourceSpecificationType.SNOWFLAKE:
      return deserialize(snowflakeDatasourceSpecificationModelSchema, json);
    default: {
      const extraConnectionDatasourceSpecificationProtocolDeserializers = plugins.flatMap(
        (plugin) =>
          (plugin as StoreRelational_PureProtocolProcessorPlugin_Extension).V1_getExtraConnectionDatasourceSpecificationProtocolDeserializers?.() ??
          [],
      );
      for (const deserializer of extraConnectionDatasourceSpecificationProtocolDeserializers) {
        const protocol = deserializer(json);
        if (protocol) {
          return protocol;
        }
      }
      throw new UnsupportedOperationError(
        `Can't deserialize datasource specification of type '${json._type}'. No compatible deserializer available from plugins.`,
      );
    }
  }
};

// ---------------------------------------- Authentication strategy ----------------------------------------

enum V1_AuthenticationStrategyType {
  DELEGATED_KERBEROS = 'delegatedKerberos',
  H2_DEFAULT = 'h2Default',
  TEST = 'test',
  OAUTH = 'oauth',
}

const V1_delegatedKerberosAuthenticationStrategyModelSchema = createModelSchema(
  V1_DelegatedKerberosAuthenticationStrategy,
  {
    _type: usingConstantValueSchema(
      V1_AuthenticationStrategyType.DELEGATED_KERBEROS,
    ),
    serverPrincipal: optional(primitive()),
  },
);

const V1_defaultH2AuthenticationStrategyModelSchema = createModelSchema(
  V1_DefaultH2AuthenticationStrategy,
  { _type: usingConstantValueSchema(V1_AuthenticationStrategyType.H2_DEFAULT) },
);

const V1_testDatabaseAuthenticationStrategyModelSchema = createModelSchema(
  V1_TestDatabaseAuthenticationStrategy,
  { _type: usingConstantValueSchema(V1_AuthenticationStrategyType.TEST) },
);

const V1_oAuthAuthenticationStrategyModelSchema = createModelSchema(
  V1_OAuthAuthenticationStrategy,
  {
    _type: usingConstantValueSchema(V1_AuthenticationStrategyType.OAUTH),
    oauthKey: primitive(),
    scopeName: primitive(),
  },
);

export const V1_serializeAuthenticationStrategy = (
  protocol: V1_AuthenticationStrategy,
  plugins: PureProtocolProcessorPlugin[],
): PlainObject<V1_AuthenticationStrategy> => {
  if (protocol instanceof V1_DelegatedKerberosAuthenticationStrategy) {
    return serialize(
      V1_delegatedKerberosAuthenticationStrategyModelSchema,
      protocol,
    );
  } else if (protocol instanceof V1_DefaultH2AuthenticationStrategy) {
    return serialize(V1_defaultH2AuthenticationStrategyModelSchema, protocol);
  } else if (protocol instanceof V1_TestDatabaseAuthenticationStrategy) {
    return serialize(
      V1_testDatabaseAuthenticationStrategyModelSchema,
      protocol,
    );
  } else if (protocol instanceof V1_OAuthAuthenticationStrategy) {
    return serialize(V1_oAuthAuthenticationStrategyModelSchema, protocol);
  }
  const extraConnectionAuthenticationStrategyProtocolSerializers = plugins.flatMap(
    (plugin) =>
      (plugin as StoreRelational_PureProtocolProcessorPlugin_Extension).V1_getExtraConnectionAuthenticationStrategyProtocolSerializers?.() ??
      [],
  );
  for (const serializer of extraConnectionAuthenticationStrategyProtocolSerializers) {
    const json = serializer(protocol);
    if (json) {
      return json;
    }
  }
  throw new UnsupportedOperationError(
    `Can't serialize authentication strategy of type '${
      getClass(protocol).name
    }'. No compatible serializer available from plugins.`,
  );
};

export const V1_deserializeAuthenticationStrategy = (
  json: PlainObject<V1_AuthenticationStrategy>,
  plugins: PureProtocolProcessorPlugin[],
): V1_AuthenticationStrategy => {
  switch (json._type) {
    case V1_AuthenticationStrategyType.DELEGATED_KERBEROS:
      return deserialize(
        V1_delegatedKerberosAuthenticationStrategyModelSchema,
        json,
      );
    case V1_AuthenticationStrategyType.H2_DEFAULT:
      return deserialize(V1_defaultH2AuthenticationStrategyModelSchema, json);
    case V1_AuthenticationStrategyType.TEST:
      return deserialize(
        V1_testDatabaseAuthenticationStrategyModelSchema,
        json,
      );
    case V1_AuthenticationStrategyType.OAUTH:
      return deserialize(V1_oAuthAuthenticationStrategyModelSchema, json);
    default: {
      const extraConnectionAuthenticationStrategyProtocolDeserializers = plugins.flatMap(
        (plugin) =>
          (plugin as StoreRelational_PureProtocolProcessorPlugin_Extension).V1_getExtraConnectionAuthenticationStrategyProtocolDeserializers?.() ??
          [],
      );
      for (const deserializer of extraConnectionAuthenticationStrategyProtocolDeserializers) {
        const protocol = deserializer(json);
        if (protocol) {
          return protocol;
        }
      }
      throw new UnsupportedOperationError(
        `Can't deserialize authentication strategy of type '${json._type}'. No compatible deserializer available from plugins.`,
      );
    }
  }
};

export const V1_serializeConnectionValue = (
  protocol: V1_Connection,
  allowPointer: boolean,
): PlainObject<V1_Connection> => {
  /* @MARKER: NEW CONNECTION TYPE SUPPORT --- consider adding connection type handler here whenever support for a new one is added to the app */
  if (protocol instanceof V1_JsonModelConnection) {
    return serialize(V1_jsonModelConnectionModelSchema, protocol);
  } else if (protocol instanceof V1_ModelChainConnection) {
    return serialize(V1_modelChainConnectionModelSchema, protocol);
  } else if (protocol instanceof V1_XmlModelConnection) {
    return serialize(V1_xmlModelConnectionModelSchema, protocol);
  } else if (protocol instanceof V1_FlatDataConnection) {
    return serialize(V1_flatDataConnectionModelSchema, protocol);
  } else if (protocol instanceof V1_RelationalDatabaseConnection) {
    return serialize(V1_RelationalDatabaseConnection, protocol);
  } else if (protocol instanceof V1_ConnectionPointer) {
    if (allowPointer) {
      return serialize(V1_connectionPointerModelSchema, protocol);
    }
    throw new IllegalStateError(
      `Serializing connection pointer is not allowed here`,
    );
  }
  throw new UnsupportedOperationError(
    `Can't serialize connection of type '${getClass(protocol).name}'`,
  );
};

export const V1_deserializeConnectionValue = (
  json: PlainObject<V1_Connection>,
  allowPointer: boolean,
): V1_Connection => {
  switch (json._type) {
    /* @MARKER: NEW CONNECTION TYPE SUPPORT --- consider adding connection type handler here whenever support for a new one is added to the app */
    case V1_ConnectionType.JSON_MODEL_CONNECTION:
      return deserialize(V1_jsonModelConnectionModelSchema, json);
    case V1_ConnectionType.MODEL_CHAIN_CONNECTION:
      return deserialize(V1_modelChainConnectionModelSchema, json);
    case V1_ConnectionType.XML_MODEL_CONNECTION:
      return deserialize(V1_xmlModelConnectionModelSchema, json);
    case V1_ConnectionType.FLAT_DATA_CONNECTION:
      return deserialize(V1_flatDataConnectionModelSchema, json);
    case V1_ConnectionType.RELATIONAL_DATABASE_CONNECTION:
      return deserialize(V1_RelationalDatabaseConnection, json);
    case V1_ConnectionType.CONNECTION_POINTER:
      if (allowPointer) {
        return deserialize(V1_connectionPointerModelSchema, json);
      }
      throw new IllegalStateError(
        `Deserializing connection pointer is not allowed here`,
      );
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize connection of type '${json._type}'`,
      );
  }
};

export const V1_packageableConnectionModelSchema = createModelSchema(
  V1_PackageableConnection,
  {
    _type: usingConstantValueSchema(
      V1_PACKAGEABLE_CONNECTION_ELEMENT_PROTOCOL_TYPE,
    ),
    connectionValue: custom(
      (val) => V1_serializeConnectionValue(val, false),
      (val) => V1_deserializeConnectionValue(val, false),
    ),
    name: primitive(),
    package: primitive(),
  },
);

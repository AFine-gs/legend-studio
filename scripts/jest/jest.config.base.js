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

const path = require('path');
const {
  getBaseConfig,
} = require('@finos/legend-studio-dev-utils/JestConfigUtils');

const baseConfig = getBaseConfig({
  babelConfigPath: path.resolve(__dirname, '../../babel.config.js'),
});

module.exports = {
  ...baseConfig,
  setupFiles: ['<rootDir>/scripts/jest/setupTests.js'],
  // Setup to run immediately after the test framework has been installed in the environment
  // before each test file in the suite is executed
  // See https://jestjs.io/docs/en/configuration#setupfilesafterenv-array
  setupFilesAfterEnv: [
    ...baseConfig.setupFilesAfterEnv,
    '<rootDir>/scripts/jest/setupTestsEnv.js',
  ],
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    // mock since Jest@26 does not support ESM
    // TODO: remove this and `lodash` dependency when we upgrade to Jest@27
    '^lodash-es$': 'lodash',
  },
  modulePathIgnorePatterns: ['packages/.*/lib'],
  testPathIgnorePatterns: [
    ...baseConfig.testPathIgnorePatterns,
    '/packages/.*/lib',
  ],
  collectCoverageFrom: [
    '<rootDir>/packages/*/**/*.[jt]s?(x)',
    '!<rootDir>/packages/*/build/**',
    '!<rootDir>/packages/*/lib/**',
    '!<rootDir>/packages/*/dev/**',
    '!<rootDir>/build/**',
    '!**/node_modules/**',
    '!**/__mocks__/**',
    '!**/__tests__/**',
    '!**/vendor/**',
    '!**/scripts/**',
    '!<rootDir>/packages/legend-studio-app/cypress/**', // TODO: update this when restructure `e2e` test suite
  ],
  coverageDirectory: '<rootDir>/build/coverage',
  watchPathIgnorePatterns: [
    ...baseConfig.watchPathIgnorePatterns,
    '/packages/.*/lib',
  ],
};

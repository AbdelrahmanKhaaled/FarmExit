module.exports = {
  rootDir: '.',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.six.setup.mjs'],
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  testRegex:
    '(request-narrative-locales|management-requirements|management-decisions|staff-permissions|staff.guard)\\.spec\\.ts$',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      { tsconfig: { module: 'ESNext', moduleResolution: 'bundler', resolvePackageJsonExports: true }, useESM: true },
    ],
  },
};

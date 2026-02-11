const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { reportErrorToRemote } = require('./report-error-to-remote');

const VIRTUAL_ROOT = path.join(__dirname, '../.metro-virtual');
const VIRTUAL_ROOT_UNRESOLVED = path.join(VIRTUAL_ROOT, 'unresolved');

const handleResolveRequestError = ({ error, context, moduleName, platform }) => {
  console.error(`[Metro Resolver Error] Platform: ${platform}, Module: ${moduleName}, From: ${context.originModulePath}`);
  console.error(error.message);
  const errorMessage = `Unable to resolve module '${moduleName}' from '${context.originModulePath}'`;
  const syntheticError = new Error(errorMessage);
  syntheticError.stack = error.stack;
  reportErrorToRemote({ error: syntheticError }).catch((reportError) => {
    // no-op
  });
  if (process.env.NODE_ENV === 'production') throw error;
  if (platform !== 'web') throw error;

  const vfile = path.join(VIRTUAL_ROOT_UNRESOLVED, 'throw-fallback.js');

  // Tell Metro to load our thrower as a real source file
  return {
    filePath: vfile,
    type: 'sourceFile',
  };
};

module.exports = {
  handleResolveRequestError,
  VIRTUAL_ROOT,
  VIRTUAL_ROOT_UNRESOLVED,
};

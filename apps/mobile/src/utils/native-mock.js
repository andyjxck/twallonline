// Mock file for native-only modules on web
const React = require('react');

const mock = new Proxy(function NativeMock({ children }) {
  return children || null;
}, {
    get: (target, prop) => {
      // Handle Symbol.toPrimitive for better error messages and safety
      if (prop === Symbol.toPrimitive) {
        return (hint) => {
          if (hint === 'string') return '';
          if (hint === 'number') return 0;
          return '';
        };
      }
      
      // Standard React property safety
      if (prop === '$$typeof') return target.$$typeof;
      if (prop === 'prototype') return target.prototype;
      if (prop === 'displayName') return 'NativeMock';
      
      // Explicitly return undefined for lifecycle methods to avoid React warnings
      if (typeof prop === 'string' && (
        prop.startsWith('component') || 
        prop.startsWith('UNSAFE_component') || 
        prop.startsWith('render') ||
        ['getDerivedStateFromProps', 'getDerivedStateFromError', 'getSnapshotBeforeUpdate', 'childContextTypes', 'contextTypes', 'contextType', 'defaultProps', 'propTypes'].includes(prop)
      )) {
        return undefined;
      }

      if (prop === 'then') return undefined;
      
      // Common JS object properties
      if (prop === 'toString') return () => '[object NativeMock]';
      if (prop === 'valueOf') return () => 0;

      // Default to returning the mock for any other property access
      return mock;
    },
  apply: (target, thisArg, argumentsList) => {
    // React component behavior: if called with props, return children
    const props = argumentsList[0];
    if (props && typeof props === 'object') {
      if ('children' in props) return props.children || null;
      // If it looks like a component but has no children, just return null to avoid rendering Proxy
      if ('style' in props || 'onPress' in props) return null;
    }
    return mock;
  },
  construct: (target, argumentsList) => {
    // Support 'new NativeModule()' pattern
    return mock;
  }
});

module.exports = mock;

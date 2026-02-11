const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');
const fs = require('node:fs');
const { FileStore } = require('metro-cache');
const { reportErrorToRemote } = require('./__create/report-error-to-remote');
const {
  handleResolveRequestError,
  VIRTUAL_ROOT,
  VIRTUAL_ROOT_UNRESOLVED,
} = require('./__create/handle-resolve-request-error');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const { transformer, resolver } = config;

/* ================================
   SVG TRANSFORMER
================================ */
config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...resolver.sourceExts, 'svg'],
};

/* ================================
   SAFE VIRTUAL ROOT HANDLING
================================ */
const watchFolders = [...config.watchFolders];

if (typeof VIRTUAL_ROOT_UNRESOLVED === 'string') {
  fs.mkdirSync(VIRTUAL_ROOT_UNRESOLVED, { recursive: true });
  watchFolders.push(VIRTUAL_ROOT_UNRESOLVED);
}

if (typeof VIRTUAL_ROOT === 'string') {
  watchFolders.push(VIRTUAL_ROOT);
}

config.watchFolders = watchFolders;

/* ================================
   WEB: NATIVE-ONLY MODULE MOCKS
================================ */
const nativeMockPath = path.resolve(__dirname, 'src/utils/native-mock.js');
const nativeOnlyModules = [
  'react-native-agora',
  'agora-react-native-rtm',
  'react-native-webrtc',
  '@giphy/react-native-sdk',
  'react-native-google-mobile-ads',
  'react-native-purchases',
  'react-native-purchases-ui',
  'react-native-maps',
  'react-native-orientation-locker',
  'react-native-watch-connectivity',
  'react-native-device-info',
  'react-native-view-shot',
  'react-native-performance',
  'react-native-calendars',
  'react-native-splash-view',
  '@react-native-google-signin/google-signin',
  '@amplitude/analytics-react-native',
  '@shopify/react-native-skia',
  '@react-native-community/slider',
  'expo-tracking-transparency',
  'expo-camera',
  'expo-haptics',
  'expo-sensors',
  'expo-secure-store',
  'expo-notifications',
  'expo-gl',
  'expo-contacts',
  'expo-calendar',
  'expo-keep-awake',
  'expo-audio',
  'expo-video',
  '@config-plugins/react-native-webrtc',
];

/* ================================
   CUSTOM RESOLVER
================================ */
config.resolver.resolveRequest = (context, moduleName, platform) => {
  try {
    // Mock native-only modules on web
    if (platform === 'web') {
      const isNativeOnly = nativeOnlyModules.some(mod =>
        moduleName === mod || moduleName.startsWith(mod + '/')
      );
      if (isNativeOnly) {
        return {
          type: 'sourceFile',
          filePath: nativeMockPath,
        };
      }
    }

    if (moduleName.startsWith('@/')) {
      const relativePath = moduleName.replace('@/', '');
      const absolutePath = path.resolve(__dirname, 'src', relativePath);
      return context.resolveRequest(context, absolutePath, platform);
    }

    if (
      moduleName.startsWith('@expo-google-fonts/') &&
      moduleName !== '@expo-google-fonts/dev'
    ) {
      return context.resolveRequest(context, '@expo-google-fonts/dev', platform);
    }

    return context.resolveRequest(context, moduleName, platform);
  } catch (error) {
    return handleResolveRequestError({ error, context, platform, moduleName });
  }
};

/* ================================
   CACHE CONFIG
================================ */
const cacheDir = path.join(__dirname, 'caches');

if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

config.cacheStores = () => [
  new FileStore({
    root: path.join(cacheDir, '.metro-cache'),
  }),
];

config.resetCache = false;
config.fileMapCacheDirectory = cacheDir;

/* ================================
   ERROR REPORTER
================================ */
config.reporter = {
  ...config.reporter,
  update: (event) => {
    config.reporter?.update?.(event);

    const reportableErrors = [
      'error',
      'bundling_error',
      'cache_read_error',
      'hmr_client_error',
      'transformer_load_failed',
    ];

    if (reportableErrors.includes(event.type)) {
      reportErrorToRemote({ error: event.error }).catch(() => {});
    }

    return event;
  },
};

/* ================================
   TRANSFORM OPTIONS
================================ */
const originalGetTransformOptions =
  config.transformer.getTransformOptions?.bind(config.transformer);

config.transformer = {
  ...config.transformer,
  getTransformOptions: async (entryPoints, options) => {
    if (options?.dev === false) {
      fs.rmSync(cacheDir, { recursive: true, force: true });
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    return originalGetTransformOptions
      ? await originalGetTransformOptions(entryPoints, options)
      : {};
  },
};

module.exports = config;

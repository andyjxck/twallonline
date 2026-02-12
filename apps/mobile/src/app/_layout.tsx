import { useAuth } from "@/utils/auth/useAuth";
import * as UserUtils from "../utils/user";
import { supabase } from "@/utils/supabase";
import { Stack, usePathname, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync().catch(() => {});
import { useEffect, useRef, memo } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useColorScheme, Platform, AppState } from "react-native";
import { Toaster } from "sonner-native";
import { requestTrackingPermissionsAsync } from "expo-tracking-transparency";
let GiphySDK: any, GiphyDialog: any, GiphyTheme: any;
if (Platform.OS !== 'web') {
  const Giphy = require('@giphy/react-native-sdk');
  GiphySDK = Giphy.GiphySDK;
  GiphyDialog = Giphy.GiphyDialog;
  GiphyTheme = Giphy.GiphyTheme;
}
let Purchases: any;
if (Platform.OS !== 'web') {
  Purchases = require('react-native-purchases').default;
}
import Constants from "expo-constants";
import { ErrorBoundaryWrapper } from "../../__create/SharedErrorBoundary";
import * as Notifications from "expo-notifications";
import { registerForPushNotificationsAsync, checkAndSendZoneDigest } from "@/utils/notifications";
import FloatingChat from "@/components/FloatingChat";
import { InAppNotification, useInAppNotification } from "@/components/InAppNotification";
import { useLocationStore } from "@/utils/locationStore";
// Jitsi Meet globals are handled by the SDK

const isExpoGo = Constants.appOwnership === "expo";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      cacheTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const GlobalErrorReporter = () => {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      return;
    }
    const errorHandler = (event: ErrorEvent) => {
      if (typeof event.preventDefault === "function") event.preventDefault();
      console.error(event.error);
    };
    const unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
      if (typeof event.preventDefault === "function") event.preventDefault();
      console.error("Unhandled promise rejection:", event.reason);
    };
    window.addEventListener("error", errorHandler);
    window.addEventListener("unhandledrejection", unhandledRejectionHandler);
    return () => {
      window.removeEventListener("error", errorHandler);
      window.removeEventListener("unhandledrejection", unhandledRejectionHandler);
    };
  }, []);
  return null;
};

const healthyResponse = {
  type: 'sandbox:mobile:healthcheck:response',
  healthy: true,
};

function SandboxHandler() {
// ... existing SandboxHandler code ...
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'sandbox:mobile:healthcheck') {
        window.parent.postMessage(healthyResponse, '*');
      }
      if (event.data.type === 'sandbox:navigation' && event.data.pathname !== pathname) {
        router.push(event.data.pathname);
      }
    };

    window.addEventListener('message', handleMessage);
    // Immediately respond to the parent window with a healthy response
    window.parent.postMessage(healthyResponse, '*');
    window.parent.postMessage({ type: 'sandbox:mobile:ready' }, '*');

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [pathname, router]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }
    window.parent.postMessage(
      {
        type: 'sandbox:mobile:navigation',
        pathname,
      },
      '*'
    );
  }, [pathname]);

  return null;
}

const initRevenueCat = async () => {
  if (Platform.OS === 'web') return;
  try {
    const appleKey = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY;
    const googleKey = process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY;
    
    const apiKey = Platform.select({
      ios: appleKey,
      android: googleKey,
    });

    if (apiKey) {
      Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
      await Purchases.configure({ apiKey });
      console.log(`RevenueCat initialized for ${Platform.OS}`);
    } else {
      console.warn(`RevenueCat: No API key found for ${Platform.OS}. Check your .env file.`);
    }
  } catch (error) {
    if (!error.message?.includes("singleton instance")) {
      console.warn('RevenueCat initialization error:', error.message);
    }
  }
};

initRevenueCat();

// Initialize Giphy SDK
const giphyKey = process.env.EXPO_PUBLIC_GIPHY_API_KEY;
if (giphyKey && Platform.OS !== 'web') {
  try {
    GiphySDK.configure({ apiKey: giphyKey });
    console.log('Giphy SDK initialized');
  } catch (error) {
    console.warn('GiphySDK initialization error:', error);
  }
} else if (!giphyKey) {
  console.warn('Giphy SDK: No API key found. GIFs will not work.');
}

import { ThemeProvider, useTheme } from "@/utils/ThemeContext";

import HippieBackground from "@/components/HippieBackground";
import DeletionPendingOverlay from "@/components/DeletionPendingOverlay";
import UserWarningOverlay from "@/components/UserWarningOverlay";
import WebLayout from "@/components/WebLayout";

function ThemeWrapper({ children }) {
  const { isHippie, isLight, isValentines, theme } = useTheme();
  const colorScheme = useColorScheme();
  
  // Determine status bar style based on background brightness or explicit theme flag
  const statusBarStyle = isHippie ? "light" : (isLight || isValentines ? "dark" : "light");
  
  useEffect(() => {
    if (giphyKey && Platform.OS !== 'web' && GiphyDialog) {
      try {
        // Use GiphyTheme enum if available, otherwise fallback to strings
        const themeValue = (isLight || isValentines) 
          ? (GiphyTheme?.Light || 'Light') 
          : (GiphyTheme?.Dark || 'Dark');
          
        GiphyDialog.configure({ 
          theme: themeValue as any
        });
      } catch (error) {
        console.warn('GiphyDialog configuration error:', error);
      }
    }
  }, [isLight, isValentines]);

  const content = (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: Platform.OS === 'web' ? '#000000' : undefined }}>
      <StatusBar style={statusBarStyle} />
      {children}
    </SafeAreaProvider>
  );

  if (isHippie && Platform.OS !== 'web') {
    return <HippieBackground>{content}</HippieBackground>;
  }

  return content;
}

function LayoutWithTheme() {
  const { theme, isHippie } = useTheme();
  
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: (isHippie && Platform.OS !== 'web') ? "fade" : "slide_from_right",
        animationDuration: 200,
        contentStyle: { backgroundColor: (isHippie && Platform.OS !== 'web') ? 'transparent' : theme.colors.background }
      }}
    >
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="help" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="admin-page-gYI" />
        <Stack.Screen name="onboarding/welcome" />
        <Stack.Screen name="onboarding/zones" />
        <Stack.Screen
          name="post"
          options={{
            presentation: "modal",
            animation: "slide_from_bottom",
          }}
        />
        <Stack.Screen name="secret-hippie" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const { initiate, isReady, auth } = useAuth();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();
  const zoneDigestInterval = useRef<NodeJS.Timeout>();
  const { city_id, city_name, zone_name } = useLocationStore();

  useEffect(() => {
    const init = async () => {
      await initiate();
      try {
        await UserUtils.initUser();
        // Check for scheduled deletions in the background
        supabase.rpc('process_scheduled_deletions').then(() => {});
      } catch (e) {
        console.error("Failed to init user:", e);
      }
    };
    init();
    
    if (Platform.OS !== 'web') {
      (async () => {
        try {
          const { status } = await requestTrackingPermissionsAsync();
          if (status === 'granted') {
            console.log('Tracking permission granted');
          }
          
          if (!isExpoGo) {
            try {
              const ads = require('react-native-google-mobile-ads');
              if (ads) {
                const mobileAds = ads.default || ads;
                if (mobileAds && typeof mobileAds === 'function') {
                  await mobileAds().initialize();
                  console.log('AdMob initialized');
                }
              }
            } catch (e) {
              console.log('AdMob module failed to load, skipping');
            }
          }
        } catch (error) {
          console.warn('Initialization error:', error.message);
        }
      })();
    }
  }, [initiate]);

  const lastRegisteredUserId = useRef<string | null>(null);

  useEffect(() => {
      if (isReady && auth?.id && Platform.OS === 'web') {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }
      }

      if (isReady && auth?.id && Platform.OS !== 'web') {
        if (lastRegisteredUserId.current === auth.id) return;
        lastRegisteredUserId.current = auth.id;
        
        registerForPushNotificationsAsync(auth.id);

        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            console.log('Notification received:', notification);
            const content = notification.request.content;
            const data = content.data as any;
            
            useInAppNotification.getState().show({
              title: content.title || 'New Notification',
              body: content.body,
              avatar: data?.avatar,
              data: data,
            });
            
            if (data?.type === 'call' && data?.callId) {
              const { useChatStore } = require('@/utils/auth');
              useChatStore.getState().open();
            }
          });

              responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
                const data = response.notification.request.content.data as any;
                const actionIdentifier = response.actionIdentifier;
                
                if (data?.type === 'call' && data?.callId) {
                  const { useChatStore } = require('@/utils/auth');
                  
                  // Set the chat ID so user lands in the right chat
                  if (data.chatId) {
                    useChatStore.getState().setActiveChatId(data.chatId);
                  }
                  useChatStore.getState().open();
                  
                  if (actionIdentifier === 'accept') {
                    useChatStore.getState().setPendingCallAction('accept', data.callId);
                  } else if (actionIdentifier === 'decline') {
                    useChatStore.getState().setPendingCallAction('decline', data.callId);
                  } else {
                    useChatStore.getState().setPendingCallAction('show', data.callId);
                  }
                } else if (data?.link === '/chat') {
              const { useChatStore } = require('@/utils/auth');
              if (data.chatId) {
                useChatStore.getState().setActiveChatId(data.chatId);
              }
              useChatStore.getState().open();
            } else if (data?.link && typeof data.link === 'string') {
              router.push(data.link as any);
            }
          });

        return () => {
          if (notificationListener.current) {
            notificationListener.current.remove();
          }
          if (responseListener.current) {
            responseListener.current.remove();
          }
        };
      }
    }, [isReady, auth]);

  const lastLastSeenUserId = useRef<string | null>(null);
  const realtimeNotificationSub = useRef<any>(null);

  useEffect(() => {
    if (isReady && auth?.id) {
      if (realtimeNotificationSub.current) {
        supabase.removeChannel(realtimeNotificationSub.current);
      }
      
      realtimeNotificationSub.current = supabase
        .channel(`in_app_notifications:${auth.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'rnotifications',
            filter: `user_id=eq.${auth.id}`,
          },
          (payload: any) => {
            const notification = payload.new;
            useInAppNotification.getState().show({
              title: notification.title || 'New Notification',
              body: notification.message,
              data: {
                type: notification.type,
                link: notification.link,
                ...notification.metadata,
              },
            });

            // Show browser notification on web when tab is not focused
            if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              if (document.hidden || !document.hasFocus()) {
                const n = new Notification(notification.title || 'Town Wall', {
                  body: notification.message || '',
                  icon: '/assets/images/favicon.png',
                  tag: `tw-${notification.id}`,
                });
                n.onclick = () => {
                  window.focus();
                  if (notification.link) {
                    router.push(notification.link);
                  }
                  n.close();
                };
              }
            }
          }
        )
        .subscribe();

      return () => {
        if (realtimeNotificationSub.current) {
          supabase.removeChannel(realtimeNotificationSub.current);
        }
      };
    }
  }, [isReady, auth?.id]);

  useEffect(() => {
    if (isReady && auth?.id) {
      if (lastLastSeenUserId.current === auth.id) return;
      lastLastSeenUserId.current = auth.id;

      const updateLastSeen = async () => {
        try {
          await supabase
            .from('rusers')
            .update({ last_seen: new Date().toISOString() })
            .eq('id', auth.id);
        } catch (e) {
          console.error("Error updating last seen:", e);
        }
      };
      
      updateLastSeen();

      const subscription = AppState.addEventListener('change', nextAppState => {
        if (nextAppState === 'active') {
          updateLastSeen();
        }
      });

      const interval = setInterval(updateLastSeen, 1000 * 60 * 5);
      return () => {
        subscription.remove();
        clearInterval(interval);
      };
    }
  }, [isReady, auth]);

  useEffect(() => {
    if (isReady && auth?.id && city_id && Platform.OS !== 'web') {
      if (zoneDigestInterval.current) {
        clearInterval(zoneDigestInterval.current);
      }
      
      const checkDigest = () => {
        checkAndSendZoneDigest(auth.id, city_id, zone_name, city_name);
      };
      
      const initialDelay = setTimeout(checkDigest, 30000);
      
      zoneDigestInterval.current = setInterval(checkDigest, 60 * 60 * 1000);
      
      return () => {
        clearTimeout(initialDelay);
        if (zoneDigestInterval.current) {
          clearInterval(zoneDigestInterval.current);
        }
      };
    }
  }, [isReady, auth?.id, city_id, zone_name, city_name]);

  useEffect(() => {
    if (isReady) {
      const hideSplash = async () => {
        try {
          await SplashScreen.hideAsync();
        } catch (e) {
          // Ignore "No native splash screen registered" error on iOS
        }
      };
      const timer = setTimeout(hideSplash, 100);
      return () => clearTimeout(timer);
    }
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: Platform.OS === 'web' ? '#000000' : undefined }}>
          <ErrorBoundaryWrapper>
            <ThemeWrapper>
                <SandboxHandler />
                <GlobalErrorReporter />
                <Toaster position="top-center" style={{ zIndex: 99999 }} />
                <WebLayout>
                  <LayoutWithTheme />
                  <FloatingChat />
                  <InAppNotification />
                  {auth?.scheduled_for_deletion_at && (
                    <DeletionPendingOverlay scheduledDate={auth.scheduled_for_deletion_at} />
                  )}
                  <UserWarningOverlay />
                </WebLayout>
            </ThemeWrapper>

          </ErrorBoundaryWrapper>
        </GestureHandlerRootView>
      </ThemeProvider>
    </QueryClientProvider>
  );
}


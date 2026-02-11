/**
 * Safe back navigation — falls back to home if there's no history.
 * This fixes back buttons not working on web when users land directly on a page.
 */
export function goBack(router) {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/');
  }
}

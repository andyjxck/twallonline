import { ScrollViewStyleReset } from 'expo-router/html';

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: `
          html, body, #root { background-color: #000 !important; margin: 0; padding: 0; min-height: 100vh; min-height: 100dvh; }
          body { padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); }
        ` }} />
      </head>
      <body style={{ backgroundColor: '#000' }}>
        {/* Hidden Netlify form for bot detection */}
        <form name="android-beta" data-netlify="true" data-netlify-honeypot="bot-field" hidden>
          <input type="email" name="email" />
        </form>
        {children}
      </body>
    </html>
  );
}

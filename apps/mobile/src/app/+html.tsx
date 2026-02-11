import { ScrollViewStyleReset } from 'expo-router/html';

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <ScrollViewStyleReset />
      </head>
      <body>
        {/* Hidden Netlify form for bot detection */}
        <form name="android-beta" data-netlify="true" data-netlify-honeypot="bot-field" hidden>
          <input type="email" name="email" />
        </form>
        {children}
      </body>
    </html>
  );
}

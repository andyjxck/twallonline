const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withSEO(config) {
  return withDangerousMod(config, [
    'ios',
    'android',
    'web',
  ], (config) => {
    if (config.platform === 'web') {
      const htmlPath = path.join(config.modRequest.projectRoot, 'dist', 'index.html');
      
      if (fs.existsSync(htmlPath)) {
        let html = fs.readFileSync(htmlPath, 'utf8');
        
        // Update title
        html = html.replace(
          '<title>Town Wall</title>',
          '<title>Town Wall - Connect with Your Local Community | Redditch & Beyond</title>'
        );
        
        // Add meta description after title
        html = html.replace(
          '<title>Town Wall - Connect with Your Local Community | Redditch & Beyond</title>',
          `<title>Town Wall - Connect with Your Local Community | Redditch & Beyond</title>
  <meta name="description" content="Town Wall connects you with your local community. Discover local businesses, find talented individuals, join conversations, and stay connected with your neighbourhood. Available on iOS and Android." />
  <meta name="keywords" content="local community, Redditch, neighbourhood, social app, local businesses, talent discovery, chat, stories" />
  <meta name="author" content="Town Wall" />
  <meta name="robots" content="index, follow" />
  
  <!-- Canonical URL -->
  <link rel="canonical" href="https://townwall.co.uk/" />
  
  <!-- Open Graph Meta Tags -->
  <meta property="og:title" content="Town Wall - Connect with Your Local Community" />
  <meta property="og:description" content="Discover local businesses, find talented individuals, and connect with your neighbourhood. Available on iOS and Android." />
  <meta property="og:image" content="https://townwall.co.uk/assets/images/icon.png" />
  <meta property="og:url" content="https://townwall.co.uk/" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Town Wall" />
  
  <!-- Twitter Card Meta Tags -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Town Wall - Connect with Your Local Community" />
  <meta name="twitter:description" content="Discover local businesses, find talented individuals, and connect with your neighbourhood." />
  <meta name="twitter:image" content="https://townwall.co.uk/assets/images/icon.png" />`
        );
        
        // Add JSON-LD Schema after viewport meta
        html = html.replace(
          '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />',
          `<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
  
  <!-- JSON-LD Schema -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Town Wall",
    "description": "Connect with your local community. Discover local businesses, find talented individuals, and stay connected with your neighbourhood.",
    "url": "https://townwall.co.uk/",
    "applicationCategory": "SocialNetworking",
    "operatingSystem": "iOS, Android, Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "GBP"
    },
    "author": {
      "@type": "Organization",
      "name": "Town Wall"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Town Wall"
    }
  }
  </script>`
        );
        
        // Add hidden H1 for accessibility
        html = html.replace(
          '<div id="root"></div>',
          `<div id="root">
    <h1 style="position: absolute; left: -10000px; top: auto; width: 1px; height: 1px; overflow: hidden;">Town Wall - Connect with Your Local Community</h1>
  </div>`
        );
        
        fs.writeFileSync(htmlPath, html);
      }
    }
    return config;
  });
};

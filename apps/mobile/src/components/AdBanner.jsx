import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

const ADSTERRA_KEY = 'b263e46fa6c36478fb3deabd2982aa19';

export default function AdBanner({ width = 728, height = 90, style = {} }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !containerRef.current) return;

    // Clear previous ad content
    containerRef.current.innerHTML = '';

    // Create the options script
    const optionsScript = document.createElement('script');
    optionsScript.type = 'text/javascript';
    optionsScript.text = `
      atOptions = {
        'key' : '${ADSTERRA_KEY}',
        'format' : 'iframe',
        'height' : ${height},
        'width' : ${width},
        'params' : {}
      };
    `;
    containerRef.current.appendChild(optionsScript);

    // Create the invoke script
    const invokeScript = document.createElement('script');
    invokeScript.type = 'text/javascript';
    invokeScript.src = `//www.highperformanceformat.com/${ADSTERRA_KEY}/invoke.js`;
    containerRef.current.appendChild(invokeScript);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [width, height]);

  if (Platform.OS !== 'web') return null;

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        minHeight: height,
        overflow: 'hidden',
        ...style,
      }}
    />
  );
}

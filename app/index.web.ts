import { registerRootComponent } from 'expo';
import React from 'react';

function WebPlaceholder() {
  const style: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: '#000',
    color: '#D4AF37',
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
    textAlign: 'center',
    padding: 24,
  };
  const sub: React.CSSProperties = { color: '#bbb', marginTop: 8, fontSize: 14 };

  return (
    <div style={style}>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700 }}>Web build is temporarily simplified</div>
        <div style={sub}>Please use Expo Go or a simulator (iOS/Android) to try the Provider features.</div>
      </div>
    </div>
  );
}

registerRootComponent(WebPlaceholder);


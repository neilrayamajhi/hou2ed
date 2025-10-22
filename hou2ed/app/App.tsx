import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import ErrorBoundary from './src/providers/ErrorBoundary';
import QueryProvider from './src/providers/QueryProvider';
import AuthProvider from './src/providers/AuthProvider';
import { ToastProvider } from './src/components/ui/Toast';
import { I18nProvider } from './src/i18n';

// Main App component - this is where everything starts!
export default function App() {
  return (
    // ErrorBoundary catches any crashes and shows a nice error screen
    <ErrorBoundary>
      {/* SafeAreaProvider handles device notches and safe areas */}
      <SafeAreaProvider>
        {/* I18nProvider manages translations */}
        <I18nProvider>
          {/* QueryProvider manages all our data fetching */}
          <QueryProvider>
            {/* AuthProvider manages authentication state */}
            <AuthProvider>
              {/* ToastProvider shows success/error messages */}
              <ToastProvider>
                {/* StatusBar with light text on dark background */}
                <StatusBar style="light" />
                {/* RootNavigator contains all our screens and navigation */}
                <RootNavigator />
              </ToastProvider>
            </AuthProvider>
          </QueryProvider>
        </I18nProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

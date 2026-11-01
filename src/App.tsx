import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { UserProvider } from './context/UserContext';
import { QueueProvider } from './context/QueueContext';
import { PlayerProvider } from './context/PlayerContext';
import { AppShell } from './components/layout/AppShell';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <UserProvider>
        <QueueProvider>
          <PlayerProvider>
            <AppShell />
          </PlayerProvider>
        </QueueProvider>
      </UserProvider>
    </ThemeProvider>
  );
};

export default App;

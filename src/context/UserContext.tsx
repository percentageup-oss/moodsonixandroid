import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types/music';

interface UserContextType {
  user: UserProfile;
  login: (email: string, name?: string) => void;
  signup: (email: string, name: string) => void;
  logout: () => void;
  incrementSearchCount: () => boolean; // returns false if limit hit
  isLimitReached: boolean;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  maxGuestSearches: number;
}

const GUEST_SEARCH_LIMIT = 25;

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('moodsonix_user');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return {
      id: 'guest_' + Math.random().toString(36).substring(2, 9),
      displayName: 'Guest Explorer',
      email: '',
      isGuest: true,
      searchesCount: 0
    };
  });

  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    localStorage.setItem('moodsonix_user', JSON.stringify(user));
  }, [user]);

  const isLimitReached = user.isGuest && user.searchesCount >= GUEST_SEARCH_LIMIT;

  const incrementSearchCount = (): boolean => {
    if (user.isGuest && user.searchesCount >= GUEST_SEARCH_LIMIT) {
      setShowAuthModal(true);
      return false;
    }
    setUser(prev => ({ ...prev, searchesCount: prev.searchesCount + 1 }));
    return true;
  };

  const login = (email: string, name?: string) => {
    const displayName = name || email.split('@')[0] || 'Listener';
    setUser({
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      displayName,
      email,
      isGuest: false,
      searchesCount: 0
    });
    setShowAuthModal(false);
  };

  const signup = (email: string, name: string) => {
    login(email, name);
  };

  const logout = () => {
    setUser({
      id: 'guest_' + Math.random().toString(36).substring(2, 9),
      displayName: 'Guest Explorer',
      email: '',
      isGuest: true,
      searchesCount: 0
    });
  };

  return (
    <UserContext.Provider
      value={{
        user,
        login,
        signup,
        logout,
        incrementSearchCount,
        isLimitReached,
        showAuthModal,
        setShowAuthModal,
        maxGuestSearches: GUEST_SEARCH_LIMIT
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within UserProvider');
  return context;
};

import React, { useState } from 'react';
import { useUser } from '../../context/UserContext';
import { X, Sparkles, Check, Cloud, Shield, Heart } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { showAuthModal, setShowAuthModal, login, signup, user, isLimitReached } = useUser();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  if (!showAuthModal) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    if (isSignUp) {
      signup(email.trim(), name.trim() || 'Listener');
    } else {
      login(email.trim(), name.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-3xl bg-[var(--surface-elevated)] border border-[var(--border-color)] shadow-2xl p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setShowAuthModal(false)}
          className="absolute top-5 right-5 p-1 rounded-full text-[var(--text-muted)] hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            {isLimitReached ? 'Guest Search Limit Reached' : (isSignUp ? 'Join Moodsonix' : 'Sign in to Moodsonix')}
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1.5 max-w-xs mx-auto leading-relaxed">
            {isLimitReached
              ? 'Unlock unlimited YouTube Music searches, persistent playlists, and cloud synchronization.'
              : 'Sync your favorites, personalized mood discovery, and playback queues across all devices.'}
          </p>
        </div>

        {/* Benefits list */}
        <div className="space-y-2 mb-6 p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border-color)] text-xs text-[var(--text-secondary)]">
          <div className="flex items-center gap-2.5">
            <Check className="w-4 h-4 text-[var(--accent)] shrink-0" />
            <span>Unlimited music searches & mood discovery</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Cloud className="w-4 h-4 text-[var(--accent)] shrink-0" />
            <span>Cloud sync for favorites & queue</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Heart className="w-4 h-4 text-[var(--accent)] shrink-0" />
            <span>Automatically merge your local guest favorites</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3 mb-4">
          {isSignUp && (
            <div>
              <label className="block text-[11px] font-mono uppercase text-[var(--text-muted)] mb-1">
                Your Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Rivers"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-mono uppercase text-[var(--text-muted)] mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="listener@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-[var(--accent)] text-black font-semibold text-xs hover:bg-[var(--accent-hover)] transition-all shadow-md glow-accent-sm mt-2"
          >
            {isSignUp ? 'Create Free Account' : 'Sign In'}
          </button>
        </form>

        <div className="text-center text-xs text-[var(--text-muted)]">
          {isSignUp ? (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(false)}
                className="text-[var(--accent)] hover:underline font-medium"
              >
                Sign In
              </button>
            </p>
          ) : (
            <p>
              New listener?{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(true)}
                className="text-[var(--accent)] hover:underline font-medium"
              >
                Create Account
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

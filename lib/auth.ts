import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

export type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

export type SignUpProfile = {
  full_name: string;
  role: 'student' | 'teacher';
};

let globalSession: Session | null = null;
let globalUser: User | null = null;
let globalLoading = false;
let authInitialized = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function setAuth(session: Session | null) {
  globalSession = session;
  globalUser = session?.user ?? null;
  globalLoading = false;
  notify();
}

export function useAuth(): AuthState {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const listener = () => forceRender((value) => value + 1);
    listeners.add(listener);

    if (!authInitialized) {
      authInitialized = true;
      const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT' || session || !globalSession) {
          setAuth(session);
        }
      });

      Promise.race([
        supabase.auth.getSession(),
        new Promise<null>((resolve) => {
          setTimeout(() => resolve(null), 5000);
        }),
      ]).then((result) => {
        const restoredSession = result ? result.data.session : null;
        if (restoredSession || !globalSession) {
          setAuth(restoredSession);
        }
      }).catch(() => {
        if (!globalSession) {
          setAuth(null);
        }
      });

      return () => {
        listeners.delete(listener);
        subscription.subscription.unsubscribe();
      };
    }

    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    session: globalSession,
    user: globalUser,
    loading: globalLoading,
  };
}

export async function signUp(
  email: string,
  password: string,
  profile?: SignUpProfile
) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (!error && data.session && profile) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: profile.full_name, role: profile.role })
      .eq('id', data.session.user.id);

    if (profileError) {
      return { data, error: profileError };
    }
  }
  if (!error && data.session) {
    setAuth(data.session);
  }
  return { data, error };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (!error && data.session) {
    setAuth(data.session);
  }
  return { data, error };
}

export async function signOut() {
  setAuth(null);
  supabase.auth.signOut().catch(() => undefined);
  return { error: null };
}
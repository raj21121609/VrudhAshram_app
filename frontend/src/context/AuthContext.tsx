import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../services/supabase';
import { Session, User } from '@supabase/supabase-js';
import { registerForPushNotificationsAsync } from '../services/notifications';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  role: string | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      fetchUserRole(session?.user?.id);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      fetchUserRole(session?.user?.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string | undefined) => {
    if (!userId) {
      setRole(null);
      setLoading(false);
      return;
    }

    try {
      // Query public.users table for the user role
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching role:', error);
      }
      
      setRole(data?.role || null);

      // Fetch and save Push Token
      const token = await registerForPushNotificationsAsync();
      if (token) {
        await supabase
          .from('users')
          .update({ push_token: token })
          .eq('id', userId);
      }
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

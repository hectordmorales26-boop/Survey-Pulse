import React, { createContext, useState, useEffect } from 'react';
import { supabase } from '../api/supabase';

export const AuthContext = createContext(null);

const MOCK_PROFILES = {
  'admin@test.com': { email: 'admin@test.com', role: 'ADMIN', name: 'Administrador Global' },
  'companyadmin@test.com': { email: 'companyadmin@test.com', role: 'COMPANY_ADMIN', name: 'Administrador de Empresa' },
  'evaluator@test.com': { email: 'evaluator@test.com', role: 'EVALUATOR', name: 'Evaluador Externo' }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('survey_dashboard_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setLoading(false);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const userEmail = session.user.email;
        const mockProfile = MOCK_PROFILES[userEmail];
        
        setUser({
          id: session.user.id,
          email: userEmail,
          role: mockProfile?.role || 'EVALUATOR', // default
          name: mockProfile?.name || session.user.user_metadata?.full_name || 'Usuario Registrado',
          isMock: false
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        if (MOCK_PROFILES[email.toLowerCase()]) {
          const mockUser = {
            id: 'mock-id-' + email.toLowerCase(),
            ...MOCK_PROFILES[email.toLowerCase()],
            isMock: true
          };
          setUser(mockUser);
          localStorage.setItem('survey_dashboard_user', JSON.stringify(mockUser));
          setLoading(false);
          return { success: true };
        }
        throw error;
      }
      
      setLoading(false);
      return { success: true };
    } catch (err) {
      setLoading(false);
      return { success: false, error: err.message };
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      if (user && !user.isMock) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error('Error logging out from Supabase:', err);
    } finally {
      setUser(null);
      localStorage.removeItem('survey_dashboard_user');
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

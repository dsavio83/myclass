import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { User, Session, AdminState, TeacherState } from '../types';
import * as api from '../services/api';

interface SessionContextType {
    session: Session;
    login: (sessionData: { user: User, token: string }) => void;
    logout: () => void;
    updateProfile: (updatedUser: User) => void;
    updateAdminState: (updates: Partial<AdminState>) => void;
    updateTeacherState: (updates: Partial<TeacherState>) => void;
}

const defaultAdminState: AdminState = {
    classId: null, subjectId: null, unitId: null, subUnitId: null, lessonId: null,
    selectedResourceType: null, activePage: 'browser', scrollPosition: 0
};

const defaultTeacherState: TeacherState = {
    classId: null, subjectId: null, unitId: null, subUnitId: null, lessonId: null,
    selectedResourceType: null, scrollPosition: 0
};

const defaultSession: Session = {
    user: null,
    token: null,
    adminState: defaultAdminState,
    teacherState: defaultTeacherState
};

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'learningPlatformSession';

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session>(() => {
        try {
            const savedSession = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (savedSession) {
                const parsed = JSON.parse(savedSession);
                // Ensure default states exist if they weren't in storage
                return {
                    ...defaultSession,
                    ...parsed,
                    adminState: { ...defaultAdminState, ...parsed.adminState },
                    teacherState: { ...defaultTeacherState, ...parsed.teacherState },
                };
            }
        } catch (error) {
            console.error("Failed to parse session from localStorage", error);
            localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
        return defaultSession;
    });

    useEffect(() => {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(session));
        } catch (error) {
            console.error("Failed to save session to localStorage", error);
        }
    }, [session]);

    const login = useCallback((sessionData: { user: User, token: string }) => {
        setSession(prev => ({ ...prev, user: sessionData.user, token: sessionData.token }));
        // Set the authentication token in the API service
        api.setAuthToken(sessionData.token);
    }, []);

    const logout = useCallback(() => {
        // Clear the authentication token
        api.setAuthToken(null);
        // We reset the entire session object to its default state
        setSession(defaultSession);
        // Also clear local storage for good measure
        localStorage.removeItem(LOCAL_STORAGE_KEY);
    }, []);

    const updateProfile = useCallback((updatedUser: User) => {
        setSession(prev => prev.user ? { ...prev, user: updatedUser } : prev);
    }, []);

    const updateAdminState = useCallback((updates: Partial<AdminState>) => {
        setSession(prev => ({ ...prev, adminState: { ...prev.adminState, ...updates } }));
    }, []);

    const updateTeacherState = useCallback((updates: Partial<TeacherState>) => {
        setSession(prev => ({ ...prev, teacherState: { ...prev.teacherState, ...updates } }));
    }, []);

    const contextValue = useMemo(() => ({
        session,
        login,
        logout,
        updateProfile,
        updateAdminState,
        updateTeacherState
    }), [session, login, logout, updateProfile, updateAdminState, updateTeacherState]);

    return (
        <SessionContext.Provider value={contextValue}>
            {children}
        </SessionContext.Provider>
    );
};

export const useSession = (): SessionContextType => {
    const context = useContext(SessionContext);
    if (context === undefined) {
        // Provide a more helpful error and recovery option
        console.warn('useSession called outside SessionProvider. This might be during app initialization.');
        // Return a minimal context to prevent crashes during development
        return {
            session: defaultSession,
            login: () => {},
            logout: () => {},
            updateProfile: () => {},
            updateAdminState: () => {},
            updateTeacherState: () => {},
        };
    }
    return context;
};
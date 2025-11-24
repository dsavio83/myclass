import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { User, Session, AdminState, TeacherState, FontSize } from '../types';

interface SessionContextType {
    session: Session;
    login: (sessionData: { user: User, token: string }) => void;
    logout: () => void;
    updateProfile: (updatedUser: User) => void;
    updateAdminState: (updates: Partial<AdminState>) => void;
    updateTeacherState: (updates: Partial<TeacherState>) => void;
    setFontSize: (size: FontSize) => void;
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
    teacherState: defaultTeacherState,
    fontSize: 12 // Default to 12px
};

const SessionContext = createContext<SessionContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'learningPlatformSession';

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session>(() => {
        try {
            const savedSession = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (savedSession) {
                const parsed = JSON.parse(savedSession);
                return {
                    ...defaultSession,
                    ...parsed,
                    adminState: { ...defaultAdminState, ...parsed.adminState },
                    teacherState: { ...defaultTeacherState, ...parsed.teacherState },
                    // Ensure fontSize is a number, fallback to 12 if invalid or old string format
                    fontSize: typeof parsed.fontSize === 'number' ? parsed.fontSize : 12 
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
    }, []);

    const logout = useCallback(() => {
        setSession(defaultSession);
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

    const setFontSize = useCallback((size: FontSize) => {
        setSession(prev => ({ ...prev, fontSize: size }));
    }, []);

    const contextValue = useMemo(() => ({
        session,
        login,
        logout,
        updateProfile,
        updateAdminState,
        updateTeacherState,
        setFontSize
    }), [session, login, logout, updateProfile, updateAdminState, updateTeacherState, setFontSize]);

    return (
        <SessionContext.Provider value={contextValue}>
            {children}
        </SessionContext.Provider>
    );
};

export const useSession = (): SessionContextType => {
    const context = useContext(SessionContext);
    if (context === undefined) {
        throw new Error('useSession must be used within a SessionProvider');
    }
    return context;
};
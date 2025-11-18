import React, { useState, useCallback, useEffect, useRef } from 'react';
import { CascadeSelectors } from './CascadeSelectors';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ResourceType } from '../types';
import { ContentDisplay } from './ContentDisplay';
import { useSession } from '../context/SessionContext';
import { TeacherState } from '../types';

export const TeacherView: React.FC = () => {
    const { session, logout, updateTeacherState } = useSession();
    const { user, teacherState: state } = session;

    const [sidebarOpen, setSidebarOpen] = useState(true);
    const mainContentRef = useRef<HTMLElement>(null);

    // Restore scroll position when the view changes
    useEffect(() => {
        const timer = setTimeout(() => {
            if (mainContentRef.current) {
                mainContentRef.current.scrollTop = state.scrollPosition;
            }
        }, 0);
        return () => clearTimeout(timer);
    }, [state.classId, state.subjectId, state.unitId, state.subUnitId, state.lessonId, state.selectedResourceType]);

    const handleScroll = useCallback(() => {
        if (mainContentRef.current) {
            updateTeacherState({ scrollPosition: mainContentRef.current.scrollTop });
        }
    }, [updateTeacherState]);
  
    const updateStateAndResetScroll = useCallback((updates: Partial<TeacherState>) => {
        updateTeacherState({ ...updates, scrollPosition: 0 });
        if (mainContentRef.current) {
            mainContentRef.current.scrollTop = 0;
        }
    }, [updateTeacherState]);

    const handleClassChange = useCallback((id: string | null) => {
        updateStateAndResetScroll({ classId: id, subjectId: null, unitId: null, subUnitId: null, lessonId: null, selectedResourceType: null });
    }, [updateStateAndResetScroll]);

    const handleSubjectChange = useCallback((id: string | null) => {
        updateStateAndResetScroll({ subjectId: id, unitId: null, subUnitId: null, lessonId: null, selectedResourceType: null });
    }, [updateStateAndResetScroll]);

    const handleUnitChange = useCallback((id: string | null) => {
        updateStateAndResetScroll({ unitId: id, subUnitId: null, lessonId: null, selectedResourceType: null });
    }, [updateStateAndResetScroll]);

    const handleSubUnitChange = useCallback((id: string | null) => {
        updateStateAndResetScroll({ subUnitId: id, lessonId: null, selectedResourceType: null });
    }, [updateStateAndResetScroll]);

    const handleLessonChange = useCallback((id: string | null) => {
        updateStateAndResetScroll({ lessonId: id, selectedResourceType: id ? 'book' : null });
    }, [updateStateAndResetScroll]);
  
    const handleSelectResourceType = useCallback((resourceType: ResourceType) => {
        updateStateAndResetScroll({ selectedResourceType: resourceType });
    }, [updateStateAndResetScroll]);

    if (!user) {
        return null; // Safeguard
    }

    return (
        <>
            <Header user={user} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} onLogout={logout}/>
            <div className="flex flex-1 overflow-hidden">
                <Sidebar 
                    lessonId={state.lessonId}
                    selectedResourceType={state.selectedResourceType}
                    onSelectResourceType={handleSelectResourceType}
                    isOpen={sidebarOpen}
                />
                <main 
                    ref={mainContentRef}
                    onScroll={handleScroll}
                    className="flex-1 flex flex-col bg-gray-100 dark:bg-gray-800 overflow-y-auto transition-all duration-300 border-l border-gray-200 dark:border-gray-700">
                    <CascadeSelectors
                        classId={state.classId}
                        subjectId={state.subjectId}
                        unitId={state.unitId}
                        subUnitId={state.subUnitId}
                        lessonId={state.lessonId}
                        onClassChange={handleClassChange}
                        onSubjectChange={handleSubjectChange}
                        onUnitChange={handleUnitChange}
                        onSubUnitChange={handleSubUnitChange}
                        onLessonChange={handleLessonChange}
                    />
                    <div className="flex-1">
                        <ContentDisplay
                            lessonId={state.lessonId}
                            selectedResourceType={state.selectedResourceType}
                            user={user}
                        />
                    </div>
                </main>
            </div>
        </>
    );
};
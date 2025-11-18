// FIX: Import React to provide the namespace for React types.
import React from 'react';

export type UserRole = 'admin' | 'teacher';

export interface User {
  _id: string;
  name: string;
  email: string;
  username: string;
  password?: string;
  role: UserRole;
  status: 'active' | 'inactive';
  mobileNumber?: string;
  isFirstLogin: boolean;
}

export interface Class {
  _id: string;
  name: string;
}

export interface Subject {
  _id: string;
  classId: string;
  name: string;
}

export interface Unit {
  _id: string;
  subjectId: string;
  name: string;
}

export interface SubUnit {
  _id: string;
  unitId: string;
  name: string;
}

export interface Lesson {
  _id: string;
  subUnitId: string;
  name:string;
}

export type ResourceType = 'book' | 'flashcard' | 'notes' | 'qa' | 'activity' | 'extra' | 'video' | 'audio' | 'worksheet' | 'questionPaper' | 'quiz';

export type QuestionPaperCategory = 'Monthly' | 'Term Exam' | 'Model Exam' | 'SSLC Exam' | 'Custom';

export interface QuestionPaperMetadata {
    category: QuestionPaperCategory;
    subCategory?: string; // For Month, Term, Model Name, Custom Name
}

export type CognitiveProcess = 'CP1' | 'CP2' | 'CP3' | 'CP4' | 'CP5' | 'CP6' | 'CP7';
export type QuestionType = 'Basic' | 'Average' | 'Profound';
export type QuestionMarks = 2 | 3 | 5 | 6;

export interface QAMetadata {
    marks: QuestionMarks;
    cognitiveProcess: CognitiveProcess;
    questionType: QuestionType;
}

export interface Content {
  _id: string;
  lessonId: string;
  type: ResourceType;
  title?: string; // Made optional since it can be auto-generated
  body: string;
  metadata?: QuestionPaperMetadata | QAMetadata;
}

export interface GroupedContent {
  type: ResourceType;
  count: number;
  docs: Content[];
}

export type ResourceCounts = { [key in ResourceType]?: number };

export interface ApiHookResult<T> {
    data: T | null;
    isLoading: boolean;
    error: Error | null;
    setData: React.Dispatch<React.SetStateAction<T | null>>;
}

// Quiz specific types
export interface AnswerOption {
  text: string;
  isCorrect: boolean;
  rationale: string;
}

export interface QuizQuestion {
  question: string;
  answerOptions: AnswerOption[];
  hint: string;
}

export interface PlatformStats {
  classCount: number;
  subjectCount: number;
  unitCount: number;
  subUnitCount: number;
  lessonCount: number;
  contentCount: number;
  userCount: number;
  adminCount: number;
  teacherCount: number;
  contentByType: ResourceCounts;
}

export interface AdminState {
    classId: string | null;
    subjectId: string | null;
    unitId: string | null;
    subUnitId: string | null;
    lessonId: string | null;
    selectedResourceType: ResourceType | null;
    activePage: string;
    scrollPosition: number;
}

export interface TeacherState {
    classId: string | null;
    subjectId: string | null;
    unitId: string | null;
    subUnitId: string | null;
    lessonId: string | null;
    selectedResourceType: ResourceType | null;
    scrollPosition: number;
}

export interface Session {
    user: User | null;
    token: string | null;
    adminState: AdminState;
    teacherState: TeacherState;
}
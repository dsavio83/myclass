import { Class, Subject, Unit, SubUnit, Lesson, Content, ResourceType, GroupedContent, ResourceCounts, User, PlatformStats } from '../types';

// API Configuration
// Use a relative path in development and rely on Vite proxy; this avoids hardcoding host/port and CORS.
const API_BASE_URL = '/api';

// Token management
let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
};

export const getAuthToken = (): string | null => {
  if (!authToken) {
    authToken = localStorage.getItem('authToken');
  }
  return authToken;
};

// HTTP Request helper with timeout and retry logic
const apiRequest = async <T>(endpoint: string, options: RequestInit = {}, retryCount = 0): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();
  
  const TIMEOUT = 5000; // 5 seconds timeout (shorter in dev for faster failure feedback)
  
  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Request timeout after ${TIMEOUT}ms`)), TIMEOUT);
  });

  try {
    const response = await Promise.race([
      fetch(url, config),
      timeoutPromise
    ]);
    
    // Check if response is HTML (error page) instead of JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      throw new Error(`Server returned HTML instead of JSON. Endpoint: ${endpoint}. Status: ${response.status}`);
    }
    
    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: `Request failed with status ${response.status}` };
      }
      
      // Provide more detailed error information
      let errorMessage = errorData.message || `HTTP ${response.status}`;
      if (response.status === 401) {
        errorMessage = 'Authentication required. Please log in again.';
        // Clear invalid token
        setAuthToken(null);
      } else if (response.status === 403) {
        errorMessage = 'Access denied. Admin privileges required.';
      }
      
      console.error(`API Error [${endpoint}]: ${errorMessage}`, {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        headers: Object.fromEntries(response.headers.entries()),
        errorData
      });
      
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).response = errorData;
      throw error;
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error [${endpoint}]${retryCount > 0 ? ` (attempt ${retryCount + 1})` : ''}:`, error);
    
    // Retry logic for network errors (not for HTTP errors)
    if (retryCount < 2 && (error instanceof TypeError || error.message.includes('timeout'))) {
      console.log(`Retrying request to ${endpoint} in 1 second...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return apiRequest<T>(endpoint, options, retryCount + 1);
    }
    
    throw error;
  }
};

// Authentication
export const loginUser = async (username: string, password: string): Promise<{ user: User; token: string }> => {
  const response = await apiRequest<{ user: User; token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  
  setAuthToken(response.token);
  return response;
};

export const updateProfile = async (data: { password?: string; mobileNumber?: string }): Promise<User> => {
  return await apiRequest<User>('/users/me/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

// User Management
export const getUsers = (): Promise<User[]> => {
  return apiRequest<User[]>('/users');
};

export const addUser = async (user: Omit<User, '_id' | 'isFirstLogin'>): Promise<User> => {
  return await apiRequest<User>('/users', {
    method: 'POST',
    body: JSON.stringify(user),
  });
};

export const updateUser = async (id: string, updates: Partial<Omit<User, '_id'>>): Promise<User | null> => {
  console.log(`Updating user ${id} with:`, updates);
  try {
    return await apiRequest<User | null>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  } catch (error) {
    console.error('Failed to update user:', error);
    throw error;
  }
};

export const deleteUser = async (id: string): Promise<{ success: boolean }> => {
  return await apiRequest<{ success: boolean }>(`/users/${id}`, {
    method: 'DELETE',
  });
};

// Classes
export const getClasses = (): Promise<Class[]> => {
  return apiRequest<Class[]>('/classes');
};

export const addClass = async (name: string): Promise<Class> => {
  return await apiRequest<Class>('/classes', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
};

export const updateClass = async (id: string, name: string): Promise<Class | null> => {
  return await apiRequest<Class | null>(`/classes/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
};

export const deleteClass = async (id: string): Promise<{ success: boolean }> => {
  return await apiRequest<{ success: boolean }>(`/classes/${id}`, {
    method: 'DELETE',
  });
};

// Subjects
export const getSubjectsByClassId = (classId: string): Promise<Subject[]> => {
  return apiRequest<Subject[]>(`/classes/${classId}/subjects`);
};

export const addSubject = async (name: string, classId: string): Promise<Subject> => {
  return await apiRequest<Subject>(`/classes/${classId}/subjects`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
};

export const updateSubject = async (id: string, name: string): Promise<Subject | null> => {
  return await apiRequest<Subject | null>(`/subjects/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
};

export const deleteSubject = async (id: string): Promise<{ success: boolean }> => {
  return await apiRequest<{ success: boolean }>(`/subjects/${id}`, {
    method: 'DELETE',
  });
};

// Units
export const getUnitsBySubjectId = (subjectId: string): Promise<Unit[]> => {
  return apiRequest<Unit[]>(`/subjects/${subjectId}/units`);
};

export const addUnit = async (name: string, subjectId: string): Promise<Unit> => {
  return await apiRequest<Unit>(`/subjects/${subjectId}/units`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
};

export const updateUnit = async (id: string, name: string): Promise<Unit | null> => {
  return await apiRequest<Unit | null>(`/units/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
};

export const deleteUnit = async (id: string): Promise<{ success: boolean }> => {
  return await apiRequest<{ success: boolean }>(`/units/${id}`, {
    method: 'DELETE',
  });
};

// Sub-units
export const getSubUnitsByUnitId = (unitId: string): Promise<SubUnit[]> => {
  return apiRequest<SubUnit[]>(`/units/${unitId}/sub-units`);
};

export const addSubUnit = async (name: string, unitId: string): Promise<SubUnit> => {
  return await apiRequest<SubUnit>(`/units/${unitId}/sub-units`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
};

export const updateSubUnit = async (id: string, name: string): Promise<SubUnit | null> => {
  return await apiRequest<SubUnit | null>(`/sub-units/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
};

export const deleteSubUnit = async (id: string): Promise<{ success: boolean }> => {
  return await apiRequest<{ success: boolean }>(`/sub-units/${id}`, {
    method: 'DELETE',
  });
};

// Lessons
export const getLessonsBySubUnitId = (subUnitId: string): Promise<Lesson[]> => {
  return apiRequest<Lesson[]>(`/sub-units/${subUnitId}/lessons`);
};

export const addLesson = async (name: string, subUnitId: string): Promise<Lesson> => {
  return await apiRequest<Lesson>(`/sub-units/${subUnitId}/lessons`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
};

export const updateLesson = async (id: string, name: string): Promise<Lesson | null> => {
  return await apiRequest<Lesson | null>(`/lessons/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
};

export const deleteLesson = async (id: string): Promise<{ success: boolean }> => {
  return await apiRequest<{ success: boolean }>(`/lessons/${id}`, {
    method: 'DELETE',
  });
};

export const getBreadcrumbs = (lessonId: string): Promise<string> => {
  return apiRequest<{ path: string }>(`/lessons/${lessonId}/breadcrumbs`).then(response => response.path);
};

// Content
export const getContentsByLessonId = (lessonId: string, types?: ResourceType[]): Promise<GroupedContent[]> => {
  const params = new URLSearchParams();
  if (types && types.length > 0) {
    params.append('types', types.join(','));
  }
  
  const queryString = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<GroupedContent[]>(`/lessons/${lessonId}/contents${queryString}`);
};

export const getCountsByLessonId = (lessonId: string): Promise<ResourceCounts> => {
  return apiRequest<ResourceCounts>(`/lessons/${lessonId}/counts`);
};

// File upload function
export const uploadFile = async (file: File, lessonId: string, title: string, contentType: string, defaultFilename?: string): Promise<Content> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('lessonId', lessonId);
  formData.append('title', title);
  formData.append('contentType', contentType);
  if (defaultFilename) {
    formData.append('defaultFilename', defaultFilename);
  }

  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
    throw new Error(errorData.message || `Upload failed with status ${response.status}`);
  }

  return await response.json();
};

// Get filename suggestion
export const getFilenameSuggestion = async (lessonId: string, fileType: string = 'pdf'): Promise<{ suggestedFilename: string; originalParts: any }> => {
  return await apiRequest<{ suggestedFilename: string; originalParts: any }>(
    `/filename-suggestion/${lessonId}?fileType=${fileType}`
  );
};

export const addContent = async (contentData: Omit<Content, '_id'>): Promise<Content> => {
  return await apiRequest<Content>(`/lessons/${contentData.lessonId}/contents`, {
    method: 'POST',
    body: JSON.stringify(contentData),
  });
};

export const addMultipleContent = async (lessonId: string, contentsData: Omit<Content, '_id'>[]): Promise<Content[]> => {
  return await apiRequest<Content[]>(`/lessons/${lessonId}/contents/bulk`, {
    method: 'POST',
    body: JSON.stringify(contentsData),
  });
};

export const updateContent = async (id: string, updates: Partial<Omit<Content, '_id'>>): Promise<Content | null> => {
  return await apiRequest<Content | null>(`/contents/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
};

export const deleteContent = async (id: string): Promise<{ success: boolean }> => {
  return await apiRequest<{ success: boolean }>(`/contents/${id}`, {
    method: 'DELETE',
  });
};

// Reports
export const getPlatformStats = (): Promise<PlatformStats> => {
  return apiRequest<PlatformStats>('/reports/stats');
};

// Initialize token from localStorage on module load
if (typeof window !== 'undefined') {
  const savedToken = localStorage.getItem('authToken');
  if (savedToken) {
    authToken = savedToken;
  }
}
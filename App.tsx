import React from 'react';
import { Login } from './components/Login';
import { AdminView } from './components/AdminView';
import { TeacherView } from './components/TeacherView';
import { FirstTimeLogin } from './components/FirstTimeLogin';
import { SessionProvider, useSession } from './context/SessionContext';
import { ToastProvider } from './context/ToastContext'; // Import ToastProvider

const AppContent: React.FC = () => {
  const { session } = useSession();
  const currentUser = session.user;

  if (!currentUser) {
    return <Login />;
  }
  
  if (currentUser.isFirstLogin) {
    return <FirstTimeLogin />;
  }

  // If user is Admin OR is a Teacher with Edit Permissions, show AdminView
  // AdminView handles hiding specific menus for non-admins internally.
  if (currentUser.role === 'admin' || (currentUser.role === 'teacher' && currentUser.canEdit)) {
    return <AdminView />;
  }

  // Otherwise (Regular Teacher, Student), show TeacherView
  return <TeacherView />;
};

const App: React.FC = () => {
  return (
    <SessionProvider>
      <ToastProvider> {/* Wrap AppContent with ToastProvider */}
        <AppContent />
      </ToastProvider>
    </SessionProvider>
  );
};

export default App;
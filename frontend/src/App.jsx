import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Landing from './pages/Landing'
import NotesPanel from './components/NotesPanel'
import TeacherClassroom from './components/TeacherClassroom'
import StudentClassroom from './components/StudentClassroom'
import TeacherLayout from './layouts/TeacherLayout'
import StudentLayout from './layouts/StudentLayout'
import TeacherOverview from './pages/teacher/Overview'
import TeacherCollections from './pages/teacher/Collections'
import TeacherGenerate from './pages/teacher/Generate'
import TeacherWorkspacePage from './pages/teacher/Workspace'
import StudentOverview from './pages/student/Overview'
import StudentCatalog from './pages/student/Catalog'
import StudentGenerate from './pages/student/Generate'
import StudentPractice from './pages/student/Practice'

function Home() {
  const { user } = useAuth()
  if (user) return <Navigate to={user.role==='teacher'?'/teacher':'/student'} replace />
  return <Landing />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route path="/teacher" element={<ProtectedRoute role="teacher"><TeacherLayout /></ProtectedRoute>}>
            <Route index element={<TeacherOverview />} />
            <Route path="collections" element={<TeacherCollections />} />
            <Route path="generate" element={<TeacherGenerate />} />
            <Route path="workspace" element={<TeacherWorkspacePage />} />
            <Route path="classroom" element={<TeacherClassroom />} />
            <Route path="notes" element={<NotesPanel />} />
          </Route>

          <Route path="/student" element={<ProtectedRoute role="student"><StudentLayout /></ProtectedRoute>}>
            <Route index element={<StudentOverview />} />
            <Route path="catalog" element={<StudentCatalog />} />
            <Route path="generate" element={<StudentGenerate />} />
            <Route path="classroom" element={<StudentClassroom />} />
            <Route path="practice" element={<StudentPractice />} />
            <Route path="notes" element={<NotesPanel />} />
          </Route>

          <Route path="*" element={<div style={{ padding:40 }}>404 Not Found</div>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

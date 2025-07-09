import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { MusicProvider } from "@/contexts/MusicContext";
import DashboardLayout from "./components/layout/DashboardLayout";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Articles from "./pages/Articles";
import Feedback from "./pages/Feedback";
import Analytics from "./pages/Analytics";
import Todo from "./pages/Todo";
import Notepad from "./pages/Notepad";
import MyFiles from "./pages/MyFiles";
import Music from "./pages/Music";
import SongsList from "./pages/SongsList";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import FoodTracker from "./pages/FoodTracker";
import ScreenRecorder from "./pages/ScreenRecorder";
import FoodTracker2 from "./pages/FoodTracker2";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="ui-theme">
      <AuthProvider>
        <MusicProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                
                {/* Protected routes */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/" element={<DashboardLayout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="articles" element={<Articles />} />
                    <Route path="feedback" element={<Feedback />} />
                    <Route path="analytics" element={<Analytics />} />
                    <Route path="todo" element={<Todo />} />
                    <Route path="notepad" element={<Notepad />} />
                    <Route path="myfiles" element={<MyFiles />} />
                    <Route path="food-tracker" element={<FoodTracker />} />
                    <Route path="food-tracker-2" element={<FoodTracker2 />} />
                    <Route path="music" element={<Music />} />
                    <Route path="music/songs" element={<SongsList />} />
                    <Route path="screen-recorder" element={<ScreenRecorder />} />
                  </Route>
                </Route>
                
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </MusicProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

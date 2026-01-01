import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Post from "@/pages/Post";
import Profile from "@/pages/Profile";
import EditProfile from "@/pages/EditProfile";
import Auth from "@/pages/Auth";
import Admin from "@/pages/Admin";
import BarDetail from "@/pages/BarDetail";
import UserProfile from "@/pages/UserProfile";
import { BarProvider } from "@/context/BarContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/auth" component={Auth} />
      <Route path="/post" component={Post} />
      <Route path="/profile" component={Profile} />
      <Route path="/profile/edit" component={EditProfile} />
      <Route path="/admin" component={Admin} />
      <Route path="/discover" component={Home} />
      <Route path="/bars/:id" component={BarDetail} />
      <Route path="/u/:username" component={UserProfile} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BarProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </BarProvider>
    </QueryClientProvider>
  );
}

export default App;

import { useState, useEffect } from "react";
import { useLocation } from "wouter";

const RAP_USERNAMES = [
  "SpitFire_99",
  "BarKing",
  "LyricLord",
  "FlowMaster",
  "PunchlinePapi",
  "VerseBandit",
  "RhymeSchemer",
  "WordSmith_X",
  "SyllableSlayer",
  "MetaphorMike",
  "DoubleTime_D",
  "EntendreKing",
  "GhostWriter",
  "PenGame_Pro",
  "BarBarian",
  "InkSlinger",
  "CadenceKid",
  "SchemeQueen",
  "FlipMaster",
  "RawBars_Only",
];
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Mail, CheckCircle, KeyRound, User, X } from "lucide-react";
import { Link } from "wouter";
import { useBars } from "@/context/BarContext";
import { useToast } from "@/hooks/use-toast";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import iconUrl from "@/assets/icon.png";
import { getSupabase } from "@/lib/supabase";

type SignupStep = "email" | "verify" | "details";
type ResetStep = "email" | "code" | "password";

export default function Auth() {
  const [, setLocation] = useLocation();
  const { login, signup, sendVerificationCode, verifyCode } = useBars();
  const { toast } = useToast();
  
  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    try {
      const supabase = await getSupabase();
      if (!supabase) {
        toast({ title: "Error", description: "Authentication service unavailable", variant: "destructive" });
        return;
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to sign in", variant: "destructive" });
    }
  };
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [signupStep, setSignupStep] = useState<SignupStep>("email");
  const [isLoading, setIsLoading] = useState(false);
  
  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetStep, setResetStep] = useState<ResetStep>("email");
  
  // Cycling placeholder with animation
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Saved accounts feature
  const [savedAccounts, setSavedAccounts] = useState<string[]>([]);
  
  const { data: motd } = useQuery({
    queryKey: ['/api/motd'],
    queryFn: async () => {
      const res = await fetch('/api/motd');
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });
  
  useEffect(() => {
    const saved = localStorage.getItem('orphanbars_saved_accounts');
    if (saved) {
      try {
        setSavedAccounts(JSON.parse(saved));
      } catch {
        setSavedAccounts([]);
      }
    }
  }, []);
  
  const saveAccountToStorage = (user: string) => {
    const saved = localStorage.getItem('orphanbars_saved_accounts');
    let accounts: string[] = [];
    try {
      accounts = saved ? JSON.parse(saved) : [];
    } catch {
      accounts = [];
    }
    if (!accounts.includes(user)) {
      accounts.unshift(user);
      if (accounts.length > 5) accounts = accounts.slice(0, 5);
      localStorage.setItem('orphanbars_saved_accounts', JSON.stringify(accounts));
      setSavedAccounts(accounts);
    }
  };
  
  const removeAccount = (user: string) => {
    const updated = savedAccounts.filter(a => a !== user);
    localStorage.setItem('orphanbars_saved_accounts', JSON.stringify(updated));
    setSavedAccounts(updated);
  };
  
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setPlaceholderIndex((prev) => (prev + 1) % RAP_USERNAMES.length);
        setIsAnimating(false);
      }, 300);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await login(username, password, rememberMe);
      saveAccountToStorage(username);
      toast({
        title: "Welcome back!",
        description: "You're now logged in.",
      });
      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid username or password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch("/api/auth/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to login as guest");
      }
      
      const guestUser = await response.json();
      toast({
        title: "Welcome, Guest!",
        description: "You're browsing in view-only mode.",
      });
      window.location.href = "/";
    } catch (error: any) {
      toast({
        title: "Guest login failed",
        description: error.message || "Could not create guest session",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await sendVerificationCode(email);
      toast({
        title: "Code sent!",
        description: "Check your email for a 6-digit verification code.",
      });
      setSignupStep("verify");
    } catch (error: any) {
      toast({
        title: "Failed to send code",
        description: error.message || "Could not send verification email",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const verified = await verifyCode(email, code);
      if (verified) {
        toast({
          title: "Email verified!",
          description: "Now choose your username and password.",
        });
        setSignupStep("details");
      } else {
        toast({
          title: "Invalid code",
          description: "The code is incorrect or expired.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message || "Could not verify code",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signup(username, password, email, code);
      toast({
        title: "Account created!",
        description: "Welcome to Orphan Bars. Start dropping heat.",
      });
      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Signup failed",
        description: error.message || "Could not create account",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetSignup = () => {
    setSignupStep("email");
    setEmail("");
    setCode("");
    setUsername("");
    setPassword("");
  };

  const resetForgotPassword = () => {
    setShowForgotPassword(false);
    setResetStep("email");
    setResetEmail("");
    setResetCode("");
    setNewPassword("");
  };

  const handleForgotPasswordSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await api.forgotPassword(resetEmail);
      toast({
        title: "Code sent!",
        description: "If an account exists with this email, a reset code has been sent.",
      });
      setResetStep("code");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset email",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await api.resetPassword(resetEmail, resetCode, newPassword);
      toast({
        title: "Password reset!",
        description: result.username 
          ? `You can now log in as "${result.username}" with your new password.`
          : "You can now log in with your new password.",
      });
      resetForgotPassword();
    } catch (error: any) {
      toast({
        title: "Reset failed",
        description: error.message || "Invalid or expired code",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderForgotPasswordContent = () => {
    switch (resetStep) {
      case "email":
        return (
          <form onSubmit={handleForgotPasswordSendCode}>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={resetForgotPassword}
                  data-testid="button-back-login"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <CardTitle>Reset Password</CardTitle>
              </div>
              <CardDescription>Enter your email to receive a reset code.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input 
                  id="reset-email" 
                  data-testid="input-reset-email"
                  type="email"
                  placeholder="you@example.com" 
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  className="glass-input"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                type="submit" 
                data-testid="button-send-reset-code"
                className="w-full font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={isLoading}
              >
                {isLoading ? "Sending..." : "Send Reset Code"}
              </Button>
            </CardFooter>
          </form>
        );

      case "code":
        return (
          <form onSubmit={(e) => { e.preventDefault(); setResetStep("password"); }}>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => setResetStep("email")}
                  data-testid="button-back-reset-email"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <CardTitle>Enter Code</CardTitle>
              </div>
              <CardDescription className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Code sent to {resetEmail}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Reset Code</Label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={resetCode}
                    onChange={(value) => setResetCode(value)}
                    data-testid="input-reset-code"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-2">
              <Button 
                type="submit" 
                data-testid="button-verify-reset-code"
                className="w-full font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={resetCode.length !== 6}
              >
                Continue
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="text-sm text-muted-foreground"
                onClick={handleForgotPasswordSendCode}
                disabled={isLoading}
                data-testid="button-resend-reset-code"
              >
                Resend code
              </Button>
            </CardFooter>
          </form>
        );

      case "password":
        return (
          <form onSubmit={handleResetPassword}>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <KeyRound className="h-5 w-5 text-primary" />
                <CardTitle>New Password</CardTitle>
              </div>
              <CardDescription>Choose a new password for your account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input 
                  id="new-password" 
                  data-testid="input-new-password"
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="glass-input"
                />
                <p className="text-xs text-muted-foreground">At least 6 characters</p>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                type="submit" 
                data-testid="button-reset-password"
                className="w-full font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={isLoading}
              >
                {isLoading ? "Resetting..." : "Reset Password"}
              </Button>
            </CardFooter>
          </form>
        );
    }
  };

  const renderSignupContent = () => {
    switch (signupStep) {
      case "email":
        return (
          <form onSubmit={handleSendCode}>
            <CardHeader>
              <CardTitle>Create Account</CardTitle>
              <CardDescription>Enter your email to get started.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input 
                  id="signup-email" 
                  data-testid="input-signup-email"
                  type="email"
                  placeholder="you@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="glass-input"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                type="submit" 
                data-testid="button-send-code"
                className="w-full font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={isLoading}
              >
                {isLoading ? "Sending..." : "Send Verification Code"}
              </Button>
            </CardFooter>
          </form>
        );

      case "verify":
        return (
          <form onSubmit={handleVerifyCode}>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={resetSignup}
                  data-testid="button-back-signup"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <CardTitle>Verify Email</CardTitle>
              </div>
              <CardDescription className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Code sent to {email}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Verification Code</Label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={code}
                    onChange={(value) => setCode(value)}
                    data-testid="input-verification-code"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-2">
              <Button 
                type="submit" 
                data-testid="button-verify-code"
                className="w-full font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={isLoading || code.length !== 6}
              >
                {isLoading ? "Verifying..." : "Verify Code"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="text-sm text-muted-foreground"
                onClick={handleSendCode}
                disabled={isLoading}
                data-testid="button-resend-code"
              >
                Resend code
              </Button>
            </CardFooter>
          </form>
        );

      case "details":
        return (
          <form onSubmit={handleSignup}>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <CardTitle>Almost Done!</CardTitle>
              </div>
              <CardDescription>Choose your username and password.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-username">Username</Label>
                <div className="relative">
                  <Input 
                    id="signup-username" 
                    data-testid="input-signup-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="glass-input"
                  />
                  {!username && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none overflow-hidden h-5">
                      <span 
                        className={`block text-muted-foreground/60 text-sm transition-all duration-300 ease-out ${isAnimating ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}
                      >
                        {RAP_USERNAMES[placeholderIndex]}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input 
                  id="signup-password" 
                  data-testid="input-signup-password"
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="glass-input"
                />
                <p className="text-xs text-muted-foreground">At least 6 characters</p>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                type="submit" 
                data-testid="button-signup"
                className="w-full font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={isLoading}
              >
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>
            </CardFooter>
          </form>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-4">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="mb-8 text-center space-y-2">
          <Link href="/">
            <div className="flex items-center justify-center gap-2 mb-4 cursor-pointer hover:opacity-80 transition-opacity">
              <img src={iconUrl} alt="Orphan Bars" className="h-10 w-10" />
              <span className="font-logo text-3xl">ORPHAN BARS</span>
            </div>
          </Link>
          <p className="text-muted-foreground max-w-sm mx-auto">
            No home for your fire bars? Orphan 'em, cuh.
          </p>
        </div>
        
        {motd?.isActive && motd?.message && (
          <div className="w-full max-w-md mb-6 p-4 rounded-xl bg-white/[0.03] border border-white/[0.1] backdrop-blur-sm">
            <div className="flex items-start gap-3">
              <span className="text-xl">📢</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-white/90">{motd.message}</p>
                {motd.linkUrl && motd.linkText && (
                  <a 
                    href={motd.linkUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline mt-1 inline-block"
                  >
                    {motd.linkText} →
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

      <Card className="w-full max-w-md bg-white/5 backdrop-blur-2xl border-white/10 rounded-[32px] overflow-hidden shadow-[0_0_120px_rgba(139,92,246,0.4),0_8px_40px_rgba(0,0,0,0.4)]">
        <Tabs defaultValue="login" className="w-full" onValueChange={() => resetSignup()}>
          <TabsList className="grid w-full grid-cols-2 bg-transparent p-0 h-14 border-b border-white/[0.06]">
            <TabsTrigger 
              value="login" 
              className="h-full rounded-none data-[state=active]:bg-white/[0.05] data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary transition-all font-bold"
            >
              Login
            </TabsTrigger>
            <TabsTrigger 
              value="signup" 
              className="h-full rounded-none data-[state=active]:bg-white/[0.05] data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary transition-all font-bold"
            >
              Create Account
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            {showForgotPassword ? (
              renderForgotPasswordContent()
            ) : (
              <form onSubmit={handleLogin}>
                <CardHeader>
                  <CardTitle>Welcome Back</CardTitle>
                  <CardDescription>Enter your credentials to access your rhyme book.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {savedAccounts.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-xs">Quick Login</Label>
                      <div className="flex flex-wrap gap-2">
                        {savedAccounts.map((account) => (
                          <div
                            key={account}
                            className="group relative flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/50 hover:border-primary/50 hover:bg-secondary transition-all cursor-pointer"
                            onClick={() => setUsername(account)}
                            data-testid={`quick-login-${account}`}
                          >
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm font-medium">@{account}</span>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); removeAccount(account); }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                              title="Remove account"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input 
                      id="login-email" 
                      data-testid="input-login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required 
                      className="glass-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input 
                      id="login-password" 
                      data-testid="input-login-password"
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required 
                      className="glass-input"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="remember-me"
                      data-testid="checkbox-remember-me"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked === true)}
                    />
                    <Label htmlFor="remember-me" className="text-sm text-muted-foreground cursor-pointer">
                      Remember me
                    </Label>
                  </div>
                </CardContent>
                <CardFooter className="flex-col gap-4">
                  <Button 
                    type="submit" 
                    data-testid="button-login"
                    className="w-full font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={isLoading}
                  >
                    {isLoading ? "Logging in..." : "Login"}
                  </Button>
                  
                  <div className="w-full flex items-center gap-4">
                    <div className="flex-1 h-px bg-white/[0.1]" />
                    <span className="text-xs text-muted-foreground uppercase tracking-wider">Or continue with</span>
                    <div className="flex-1 h-px bg-white/[0.1]" />
                  </div>
                  
                  <div className="w-full grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full glass-input border-white/[0.1] hover:bg-white/[0.05]"
                      onClick={() => handleOAuthLogin('apple')}
                      data-testid="button-login-apple"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                      </svg>
                      <span className="ml-1">Apple</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full glass-input border-white/[0.1] hover:bg-white/[0.05]"
                      onClick={() => handleOAuthLogin('google')}
                      data-testid="button-login-google"
                    >
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      <span className="ml-1">Google</span>
                    </Button>
                  </div>
                  
                  <div className="relative w-full">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-transparent px-2 text-muted-foreground">or</span>
                    </div>
                  </div>
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full glass-input border-white/[0.1] hover:bg-white/[0.05]"
                    onClick={handleGuestLogin}
                    disabled={isLoading}
                    data-testid="button-login-guest"
                  >
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    Continue as Guest
                  </Button>
                  
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-sm text-muted-foreground"
                    onClick={() => setShowForgotPassword(true)}
                    data-testid="button-forgot-password"
                  >
                    Forgot password?
                  </Button>
                </CardFooter>
              </form>
            )}
          </TabsContent>
          
          <TabsContent value="signup">
            {renderSignupContent()}
          </TabsContent>
        </Tabs>
      </Card>
      
      <p className="mt-8 text-center text-sm text-muted-foreground">
        By continuing, you agree to our <Link href="/terms" className="underline cursor-pointer hover:text-primary">Terms of Service</Link> and <Link href="/guidelines" className="underline cursor-pointer hover:text-primary">Community Guidelines</Link>.
      </p>
      </div>
    </div>
  );
}

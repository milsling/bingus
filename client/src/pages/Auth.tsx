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
import iconUrl from "@/assets/icon.png";

type SignupStep = "email" | "verify" | "details";
type ResetStep = "email" | "code" | "password";

export default function Auth() {
  const [, setLocation] = useLocation();
  const { login, signup, sendVerificationCode, verifyCode } = useBars();
  const { toast } = useToast();
  
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
                  className="bg-secondary/30 border-border/50"
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
                  className="bg-secondary/30 border-border/50"
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
                  className="bg-secondary/30 border-border/50"
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
                    className="bg-secondary/30 border-border/50"
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
                  className="bg-secondary/30 border-border/50"
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
    <div className="min-h-screen bg-background flex flex-col p-4">
      <div className="py-4">
        <Link href="/">
          <Button variant="outline" className="gap-2" data-testid="button-back-home">
            <ArrowLeft className="h-4 w-4" />
            Back to Feed
          </Button>
        </Link>
      </div>
      
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

      <Card className="w-full max-w-md border-border bg-card/50 backdrop-blur-sm">
        <Tabs defaultValue="login" className="w-full" onValueChange={() => resetSignup()}>
          <TabsList className="grid w-full grid-cols-2 rounded-t-lg rounded-b-none bg-secondary/50 p-0 h-14">
            <TabsTrigger 
              value="login" 
              className="h-full rounded-none data-[state=active]:bg-background data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary transition-all font-bold"
            >
              Login
            </TabsTrigger>
            <TabsTrigger 
              value="signup" 
              className="h-full rounded-none data-[state=active]:bg-background data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary transition-all font-bold"
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
                    <Label htmlFor="login-username">Username</Label>
                    <div className="relative">
                      <Input 
                        id="login-username" 
                        data-testid="input-login-username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required 
                        className="bg-secondary/30 border-border/50"
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
                    <Label htmlFor="login-password">Password</Label>
                    <Input 
                      id="login-password" 
                      data-testid="input-login-password"
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required 
                      className="bg-secondary/30 border-border/50"
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
                <CardFooter className="flex-col gap-2">
                  <Button 
                    type="submit" 
                    data-testid="button-login"
                    className="w-full font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={isLoading}
                  >
                    {isLoading ? "Logging in..." : "Login"}
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

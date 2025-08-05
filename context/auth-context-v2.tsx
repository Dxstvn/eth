"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import LoadingScreen from "@/components/loading-screen"
import { authService, type UserProfile } from "@/services/auth-service"
import { passwordlessAuthService } from "@/services/passwordless-auth-service"
import { toast } from "sonner"

type AuthContextType = {
  user: UserProfile | null
  loading: boolean
  isAdmin: boolean
  isDemoAccount: boolean
  authToken: string | null
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshToken: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
  sendVerificationEmail: () => Promise<void>
  refreshProfile: () => Promise<void>
  // Passwordless authentication methods
  sendPasswordlessLink: (email: string) => Promise<void>
  verifyPasswordlessLink: (email: string, link: string) => Promise<void>
  isPasswordlessSignIn: boolean
  passwordlessEmail: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isDemoAccount, setIsDemoAccount] = useState(false)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [isPasswordlessSignIn, setIsPasswordlessSignIn] = useState(false)
  const [passwordlessEmail, setPasswordlessEmail] = useState<string | null>(null)

  // Initialize auth state from storage
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const authState = authService.getAuthState();
        
        if (authState.isAuthenticated && authState.profile) {
          setUser(authState.profile);
          setAuthToken(authState.token);
          setIsAdmin(authState.profile.isAdmin || false);
          setIsDemoAccount(authState.profile.email === "jasmindustin@gmail.com" || authState.profile.email === "dev@clearhold.local");
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Helper function for redirection after successful authentication
  const redirectToDashboard = useCallback(() => {
    // Use callback to ensure we have the latest router instance
    setTimeout(() => {
      router.push("/dashboard");
    }, 100);
  }, [router]);

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      
      // Check if Firebase is configured
      const { auth, googleProvider } = await import("@/lib/firebase-client");
      if (!auth || !googleProvider) {
        throw new Error("Authentication is not configured. Please ensure environment variables are set.");
      }

      // Sign in with Google to get ID token
      const { signInWithPopup } = await import("firebase/auth");
      const result = await signInWithPopup(auth, googleProvider);
      
      if (!result.user) {
        throw new Error("Failed to authenticate with Google");
      }

      // Get ID token
      const idToken = await result.user.getIdToken(true);
      
      // Send to backend
      const authResponse = await authService.signInWithGoogle(idToken);
      
      // Update local state
      const profile = authService.getStoredUserProfile();
      if (profile) {
        setUser(profile);
        setAuthToken(authService.getStoredToken());
        setIsAdmin(profile.isAdmin || false);
        setIsDemoAccount(profile.email === "jasmindustin@gmail.com" || profile.email === "dev@clearhold.local");
      }

      toast.success("Successfully signed in!");
      redirectToDashboard();
    } catch (error: any) {
      console.error("Google Sign-In error:", error);
      
      // Sign out from Firebase if backend auth failed
      try {
        const { auth } = await import("@/lib/firebase-client");
        if (auth) {
          const { signOut } = await import("firebase/auth");
          await signOut(auth);
        }
      } catch {}
      
      toast.error(error.message || "Failed to sign in with Google");
    } finally {
      setLoading(false);
    }
  };

  // Sign in with email
  const signInWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      const authResponse = await authService.signInWithEmail(email, password);
      
      // Update local state
      const profile = authService.getStoredUserProfile();
      if (profile) {
        setUser(profile);
        setAuthToken(authService.getStoredToken());
        setIsAdmin(profile.isAdmin || false);
        setIsDemoAccount(profile.email === "jasmindustin@gmail.com" || profile.email === "dev@clearhold.local");
      }

      toast.success("Successfully signed in!");
      redirectToDashboard();
    } catch (error: any) {
      console.error("Email Sign-In error:", error);
      toast.error(error.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  // Sign up with email
  const signUpWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      const authResponse = await authService.signUpWithEmail(email, password);
      
      // Update local state
      const profile = authService.getStoredUserProfile();
      if (profile) {
        setUser(profile);
        setAuthToken(authService.getStoredToken());
        setIsAdmin(false);
        setIsDemoAccount(false);
      }

      toast.success("Account created successfully!");
      redirectToDashboard();
    } catch (error: any) {
      console.error("Email Sign-Up error:", error);
      toast.error(error.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await authService.signOut();
      
      // Clear local state
      setUser(null);
      setAuthToken(null);
      setIsAdmin(false);
      setIsDemoAccount(false);
      
      // Sign out from Firebase if configured
      try {
        const { auth } = await import("@/lib/firebase-client");
        if (auth) {
          const { signOut: firebaseSignOut } = await import("firebase/auth");
          await firebaseSignOut(auth);
        }
      } catch {}
      
      toast.success("Signed out successfully");
      router.push("/");
    } catch (error: any) {
      console.error("Sign out error:", error);
      toast.error("Failed to sign out");
    }
  };

  // Refresh token
  const refreshToken = async () => {
    try {
      const tokenInfo = await authService.refreshToken();
      if (tokenInfo) {
        setAuthToken(tokenInfo.token);
      } else {
        // Token refresh failed, sign out
        await signOut();
      }
    } catch (error) {
      console.error("Token refresh error:", error);
      await signOut();
    }
  };

  // Update user profile
  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      const updatedProfile = await authService.updateUserProfile(updates);
      setUser(updatedProfile);
      
      // Update derived state
      if (updatedProfile.isAdmin !== undefined) {
        setIsAdmin(updatedProfile.isAdmin);
      }
      
      // Check for demo account status
      if (updatedProfile.email) {
        setIsDemoAccount(updatedProfile.email === "jasmindustin@gmail.com" || updatedProfile.email === "dev@clearhold.local");
      }
      
      toast.success("Profile updated successfully");
    } catch (error: any) {
      console.error("Profile update error:", error);
      toast.error("Failed to update profile");
      throw error;
    }
  };

  // Change password
  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      await authService.changePassword(currentPassword, newPassword);
      toast.success("Password changed successfully");
    } catch (error: any) {
      console.error("Password change error:", error);
      toast.error(error.message || "Failed to change password");
      throw error;
    }
  };

  // Request password reset
  const requestPasswordReset = async (email: string) => {
    try {
      await authService.requestPasswordReset(email);
      toast.success("Password reset email sent! Check your inbox.");
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast.error(error.message || "Failed to send password reset email");
      throw error;
    }
  };

  // Send verification email
  const sendVerificationEmail = async () => {
    try {
      await authService.sendVerificationEmail();
      toast.success("Verification email sent! Check your inbox.");
    } catch (error: any) {
      console.error("Verification email error:", error);
      toast.error(error.message || "Failed to send verification email");
      throw error;
    }
  };

  // Refresh profile from backend
  const refreshProfile = useCallback(async () => {
    try {
      const profile = await authService.getUserProfile();
      setUser(profile);
      setIsAdmin(profile.isAdmin || false);
      setIsDemoAccount(profile.email === "jasmindustin@gmail.com" || profile.email === "dev@clearhold.local");
    } catch (error: any) {
      console.error("Profile refresh error:", error);
      // Don't throw here, just log the error
    }
  }, []);

  // Send passwordless sign-in link
  const sendPasswordlessLink = async (email: string) => {
    try {
      setIsPasswordlessSignIn(true);
      setPasswordlessEmail(email);
      
      const response = await passwordlessAuthService.sendSignInLink(email);
      
      if (response.success) {
        toast.success("Magic link sent! Check your email.");
      } else {
        throw new Error(response.error || "Failed to send magic link");
      }
    } catch (error: any) {
      console.error("Passwordless link error:", error);
      toast.error(error.message || "Failed to send magic link");
      setIsPasswordlessSignIn(false);
      setPasswordlessEmail(null);
      throw error;
    }
  };

  // Verify passwordless sign-in link
  const verifyPasswordlessLink = async (email: string, link: string) => {
    try {
      setLoading(true);
      
      const response = await passwordlessAuthService.verifySignInLink(email, link);
      
      if (response.success && response.token && response.user) {
        // Store the token
        localStorage.setItem("clearhold_auth_token", response.token);
        
        // Create user profile
        const profile: UserProfile = {
          uid: response.user.uid,
          email: response.user.email || email,
          displayName: "",
          emailVerified: response.user.emailVerified,
          photoURL: null,
          wallet: null,
          kycStatus: "not_started",
          isAdmin: false
        };
        
        // Store profile
        localStorage.setItem("clearhold_user_profile", JSON.stringify(profile));
        
        // Update state
        setUser(profile);
        setAuthToken(response.token);
        setIsAdmin(false);
        setIsDemoAccount(profile.email === "jasmindustin@gmail.com" || profile.email === "dev@clearhold.local");
        setIsPasswordlessSignIn(false);
        setPasswordlessEmail(null);
        
        // Refresh profile from backend to get full details
        await refreshProfile();
        
        toast.success("Successfully signed in!");
        
        // Redirect based on user status
        if (response.isNewUser) {
          router.push("/onboarding/welcome");
        } else {
          redirectToDashboard();
        }
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error: any) {
      console.error("Passwordless verification error:", error);
      toast.error(error.message || "Failed to verify sign-in link");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Listen for storage changes (multi-tab sync)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'clearhold_auth_token' && !e.newValue) {
        // Token was removed, sign out
        setUser(null);
        setAuthToken(null);
        setIsAdmin(false);
        setIsDemoAccount(false);
        router.push("/");
      } else if (e.key === 'clearhold_user_profile' && e.newValue) {
        // Profile was updated
        try {
          const profile = JSON.parse(e.newValue);
          setUser(profile);
          setIsAdmin(profile.isAdmin || false);
          setIsDemoAccount(profile.email === "jasmindustin@gmail.com" || profile.email === "dev@clearhold.local");
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [router]);

  // Periodically refresh profile to sync with backend changes
  useEffect(() => {
    if (!user || !authToken) return;

    // Refresh profile every 5 minutes
    const interval = setInterval(() => {
      refreshProfile();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user, authToken, refreshProfile]);

  if (loading) {
    return <LoadingScreen />;
  }

  const value: AuthContextType = {
    user,
    loading,
    isAdmin,
    isDemoAccount,
    authToken,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    refreshToken,
    updateProfile,
    changePassword,
    requestPasswordReset,
    sendVerificationEmail,
    refreshProfile,
    // Passwordless authentication
    sendPasswordlessLink,
    verifyPasswordlessLink,
    isPasswordlessSignIn,
    passwordlessEmail,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
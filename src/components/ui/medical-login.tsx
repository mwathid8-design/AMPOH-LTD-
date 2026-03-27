import * as React from "react";
import { useState } from "react";
import { Shield, Lock, Hospital, ClipboardList } from "lucide-react";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "./card";
import { motion } from "framer-motion";
import { auth } from "@/src/firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";

export function MedicalLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Failed to sign in. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-slate-950">
      {/* Background Overlay */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-slate-950/70 z-10" />
        <img 
          src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=2000" 
          alt="Medical Background"
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-20 w-full max-w-md px-4"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-500/20">
            <Hospital className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mb-1">
            AMPOH CLINIC MANAGEMENT SYSTEM
          </h1>
          <p className="text-blue-400 font-medium text-sm">
            AMPOH LIMITED & AMPOH MEDICAL CENTRE
          </p>
          <p className="text-slate-400 text-xs mt-2 max-w-xs mx-auto">
            Secure Medical Records, Billing, Lab, Family Planning & Clinical Workflow Management
          </p>
        </div>

        <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl text-slate-100 shadow-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl text-center">System Access</CardTitle>
            <CardDescription className="text-center text-slate-400">
              Authorized Staff and Admin Login
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
                {error}
              </div>
            )}
            
            <Button 
              onClick={handleGoogleLogin}
              className="w-full bg-white hover:bg-slate-100 text-slate-900 font-semibold py-6 flex items-center justify-center gap-3"
              disabled={isLoading}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {isLoading ? "Signing in..." : "Sign in with Google"}
            </Button>
            
            <p className="text-[10px] text-center text-slate-500">
              Use your registered clinic email address to access the system.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 border-t border-slate-800 pt-6">
            <div className="grid grid-cols-2 gap-4 w-full">
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <Shield className="w-3 h-3 text-emerald-500" />
                <span>Secure Access Only</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <Lock className="w-3 h-3 text-emerald-500" />
                <span>Patient Data Protected</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <Hospital className="w-3 h-3 text-emerald-500" />
                <span>Branch-Aware Login</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <ClipboardList className="w-3 h-3 text-emerald-500" />
                <span>Audit Log Active</span>
              </div>
            </div>
          </CardFooter>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-slate-500 text-[10px] uppercase tracking-widest font-semibold">
            © 2026 AMPOH CLINIC MANAGEMENT SYSTEM
          </p>
          <p className="text-slate-600 text-[10px] mt-1">
            AMPOH LIMITED • AMPOH MEDICAL CENTRE
          </p>
        </div>
      </motion.div>
    </div>
  );
}

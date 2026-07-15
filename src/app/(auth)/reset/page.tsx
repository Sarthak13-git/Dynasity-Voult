"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getBaseUrl } from "@/lib/get-base-url";

function ResetPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [step, setStep] = useState<"request" | "update">("request");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    const mode = searchParams.get("mode");

    if (errorParam === "expired_or_invalid") {
      setError("This password reset link has expired. Please request a new one.");
      setStep("request");
    } else if (mode === "recovery") {
      setLoading(true);
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setStep("update");
        } else {
          setError("This password reset link has expired. Please request a new one.");
          setStep("request");
        }
        setLoading(false);
      });
    }
  }, [searchParams, supabase]);

  // Step 1: Send Reset Link to Email
  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    // Never check the profiles table before calling resetPasswordForEmail.
    // Doing so causes:
    //   1. Inconsistent behavior: RLS policies / anon-key access differ by
    //      environment, device, and session state — so the same email returns
    //      different results on mobile vs desktop.
    //   2. Account enumeration: "No account found" leaks whether an email
    //      is registered, a security vulnerability.
    //
    // Supabase handles non-existent emails silently on its own (no email sent,
    // no error returned to the client). We always show the same neutral message.

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getBaseUrl()}/callback?type=recovery&next=/reset`,
    });

    setLoading(false);

    if (resetError) {
      // Only surface real infrastructure errors — not "user not found" style messages.
      // Supabase never returns "user not found" here; it silently no-ops.
      setError(resetError.message);
      return;
    }

    // Always show the same neutral message regardless of whether the email
    // is registered. This is both consistent and secure.
    setSuccessMessage(
      "If an account exists for this email, we've sent a password reset link. Please check your inbox."
    );
  };

  // Step 2: Update Password
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setSuccessMessage("Password reset successful! Redirecting to login...");
    setLoading(false);

    // Sign out recovery session so user has to log in with their new credentials
    await supabase.auth.signOut();

    setTimeout(() => {
      router.push("/login?success=password_reset");
    }, 2000);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-pandora-ivory px-6 pt-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md bg-white p-8 border border-pandora-cream shadow-sm rounded-lg text-center"
      >
        <Link
          href="/"
          className="font-serif text-2xl font-black tracking-[0.3em] text-pandora-charcoal block mb-8 animate-fade-in"
          style={{ fontWeight: 900 }}
        >
          DYNASITY-VOULT
        </Link>

        {step === "request" && (
          <div className="animate-fade-in">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-pandora-ivory mb-6">
              <Mail className="h-8 w-8 text-pandora-gold" />
            </div>
            <h1 className="font-serif text-3xl font-medium text-pandora-charcoal">
              Reset Password
            </h1>
            <p className="mt-2 text-[14px] text-pandora-gray leading-relaxed mb-8">
              Enter your email address and we will send you a link to reset your password.
            </p>

            <form onSubmit={handleSendResetLink} className="space-y-5 text-left">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 text-sm rounded-md border border-red-200 text-center">
                  {error}
                </div>
              )}
              {successMessage && (
                <div className="bg-emerald-50 text-emerald-700 text-sm p-3 rounded border border-emerald-100 text-center">
                  {successMessage}
                </div>
              )}
              <div>
                <label
                  htmlFor="email"
                  className="text-[11px] font-semibold uppercase tracking-[0.15em] text-pandora-gray"
                >
                  Email Address
                </label>
                <div className="relative mt-2">
                  <Mail
                    size={16}
                    strokeWidth={1.5}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-pandora-gray-light"
                  />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full border border-pandora-cream bg-white py-3.5 pl-11 pr-4 text-[14px] text-pandora-charcoal placeholder:text-pandora-gray-light/60 focus:border-pandora-gold focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-center gap-3 bg-pandora-charcoal py-4 text-[12px] font-semibold uppercase tracking-[0.15em] text-white transition-colors hover:bg-pandora-gold disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Sending..." : "Send Reset Link"}
                {!loading && (
                  <ArrowRight
                    size={14}
                    className="transition-transform group-hover:translate-x-1"
                  />
                )}
              </button>
            </form>
          </div>
        )}

        {step === "update" && (
          <div className="animate-fade-in">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-pandora-ivory mb-6">
              <Lock className="h-8 w-8 text-pandora-gold" />
            </div>
            <h1 className="font-serif text-3xl font-medium text-pandora-charcoal">
              New Password
            </h1>
            <p className="mt-2 text-[14px] text-pandora-gray leading-relaxed mb-8">
              Enter your new account password below.
            </p>

            <form onSubmit={handleUpdatePassword} className="space-y-5 text-left">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 text-sm rounded-md border border-red-200 text-center">
                  {error}
                </div>
              )}
              {successMessage && (
                <div className="bg-emerald-50 text-emerald-700 text-sm p-3 rounded border border-emerald-100 text-center">
                  {successMessage}
                </div>
              )}
              <div>
                <label
                  htmlFor="password"
                  className="text-[11px] font-semibold uppercase tracking-[0.15em] text-pandora-gray"
                >
                  New Password
                </label>
                <div className="relative mt-2">
                  <Lock
                    size={16}
                    strokeWidth={1.5}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-pandora-gray-light"
                  />
                  <input
                    id="password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    required
                    minLength={8}
                    className="w-full border border-pandora-cream bg-white py-3.5 pl-11 pr-4 text-[14px] text-pandora-charcoal placeholder:text-pandora-gray-light/60 focus:border-pandora-gold focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="text-[11px] font-semibold uppercase tracking-[0.15em] text-pandora-gray"
                >
                  Confirm Password
                </label>
                <div className="relative mt-2">
                  <Lock
                    size={16}
                    strokeWidth={1.5}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-pandora-gray-light"
                  />
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    required
                    minLength={8}
                    className="w-full border border-pandora-cream bg-white py-3.5 pl-11 pr-4 text-[14px] text-pandora-charcoal placeholder:text-pandora-gray-light/60 focus:border-pandora-gold focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-center gap-3 bg-pandora-charcoal py-4 text-[12px] font-semibold uppercase tracking-[0.15em] text-white transition-colors hover:bg-pandora-gold disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Updating..." : "Update Password"}
                {!loading && (
                  <ArrowRight
                    size={14}
                    className="transition-transform group-hover:translate-x-1"
                  />
                )}
              </button>
            </form>
          </div>
        )}

        {/* Back to Sign In Link */}
        <p className="mt-8 text-center text-[13px] text-pandora-gray">
          Remembered your password?{" "}
          <Link
            href="/login"
            className="font-semibold text-pandora-charcoal transition-colors hover:text-pandora-gold"
          >
            Sign In
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

export default function ResetPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-pandora-ivory">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-pandora-gold" />
        </div>
      }
    >
      <ResetPageContent />
    </Suspense>
  );
}

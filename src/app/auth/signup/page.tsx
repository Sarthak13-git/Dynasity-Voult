"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Mail, Lock, User, ArrowRight } from "lucide-react";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // TODO: Implement with real Supabase credentials
    console.log("Signup with:", name, email, password);
    setLoading(false);
  };

  const handleGoogleSignup = async () => {
    // TODO: Implement with real Supabase credentials
    console.log("Google signup");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-pandora-ivory px-6 pt-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center">
          <Link
            href="/"
            className="font-serif text-2xl font-bold tracking-[0.3em] text-pandora-charcoal"
          >
            PANDORA
          </Link>
          <h1 className="mt-8 font-serif text-3xl font-medium text-pandora-charcoal">
            Join PANDORA
          </h1>
          <p className="mt-2 text-[14px] text-pandora-gray">
            Create your account to begin collecting and bidding.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSignup} className="mt-10 space-y-5">
          <div>
            <label
              htmlFor="name"
              className="text-[11px] font-semibold uppercase tracking-[0.15em] text-pandora-gray"
            >
              Full Name
            </label>
            <div className="relative mt-2">
              <User
                size={16}
                strokeWidth={1.5}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-pandora-gray-light"
              />
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                required
                className="w-full border border-pandora-cream bg-white py-3.5 pl-11 pr-4 text-[14px] text-pandora-charcoal placeholder:text-pandora-gray-light/60 focus:border-pandora-gold focus:outline-none transition-colors"
              />
            </div>
          </div>

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

          <div>
            <label
              htmlFor="password"
              className="text-[11px] font-semibold uppercase tracking-[0.15em] text-pandora-gray"
            >
              Password
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                required
                minLength={8}
                className="w-full border border-pandora-cream bg-white py-3.5 pl-11 pr-4 text-[14px] text-pandora-charcoal placeholder:text-pandora-gray-light/60 focus:border-pandora-gold focus:outline-none transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group flex w-full items-center justify-center gap-3 bg-pandora-charcoal py-4 text-[12px] font-semibold uppercase tracking-[0.15em] text-white transition-colors hover:bg-pandora-gold disabled:opacity-50"
          >
            {loading ? "Creating Account..." : "Create Account"}
            {!loading && (
              <ArrowRight
                size={14}
                className="transition-transform group-hover:translate-x-1"
              />
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="my-8 flex items-center gap-4">
          <div className="h-px flex-1 bg-pandora-cream" />
          <span className="text-[11px] uppercase tracking-[0.15em] text-pandora-gray-light">
            or
          </span>
          <div className="h-px flex-1 bg-pandora-cream" />
        </div>

        {/* Google Signup */}
        <button
          onClick={handleGoogleSignup}
          className="flex w-full items-center justify-center gap-3 border border-pandora-cream bg-white py-4 text-[13px] font-medium text-pandora-charcoal transition-colors hover:bg-pandora-ivory"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>

        {/* Terms */}
        <p className="mt-6 text-center text-[12px] leading-relaxed text-pandora-gray-light">
          By creating an account you agree to our{" "}
          <Link
            href="/terms"
            className="text-pandora-charcoal underline hover:text-pandora-gold"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="text-pandora-charcoal underline hover:text-pandora-gold"
          >
            Privacy Policy
          </Link>
          .
        </p>

        {/* Footer */}
        <p className="mt-6 text-center text-[13px] text-pandora-gray">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="font-semibold text-pandora-charcoal transition-colors hover:text-pandora-gold"
          >
            Sign In
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

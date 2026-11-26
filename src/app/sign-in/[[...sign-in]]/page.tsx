"use client";

import { role } from "@/lib/data";
import { useSignIn, useUser } from "@clerk/nextjs";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

type VerificationMode = "device-trust" | "mfa" | null;
type MfaMethod = "phone_code" | "totp" | "backup_code";

const LoginPage = () => {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signIn, errors, fetchStatus } = useSignIn();

  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");

  const [verificationMode, setVerificationMode] =
    useState<VerificationMode>(null);

  const [mfaMethod, setMfaMethod] = useState<MfaMethod>("totp");

  const [formError, setFormError] = useState<string | null>(null);

  const isLoading = fetchStatus === "fetching";

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const role = user?.publicMetadata?.role;

    if (typeof role === "string" && role.trim()) {
      router.replace(`/${encodeURIComponent(role.trim())}`);
    }
  }, [isLoaded, isSignedIn, user, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    try {
      const { error } = await signIn.password({
        identifier: username.trim(),
        password,
      });

      if (error) {
        setFormError(error.message);
        return;
      }

      if (signIn.status === "complete") {
        await signIn.finalize();
        return;
      }

      if (signIn.status === "needs_client_trust") {
        const emailCodeFactor = signIn.supportedSecondFactors?.find(
          (factor) => factor.strategy === "email_code",
        );

        if (!emailCodeFactor) {
          setFormError("Metode verifikasi perangkat belum didukung.");
          return;
        }

        const { error: sendError } = await signIn.mfa.sendEmailCode();

        if (sendError) {
          setFormError(sendError.message);
          return;
        }

        setVerificationMode("device-trust");
        return;
      }

      if (signIn.status === "needs_second_factor") {
        const factors = signIn.supportedSecondFactors ?? [];

        if (factors.some((factor) => factor.strategy === "totp")) {
          setMfaMethod("totp");
        } else if (factors.some((factor) => factor.strategy === "phone_code")) {
          const { error: sendError } = await signIn.mfa.sendPhoneCode();

          if (sendError) {
            setFormError(sendError.message);
            return;
          }

          setMfaMethod("phone_code");
        } else if (
          factors.some((factor) => factor.strategy === "backup_code")
        ) {
          setMfaMethod("backup_code");
        } else {
          setFormError(
            "Metode MFA akun ini belum didukung oleh halaman login.",
          );
          return;
        }

        setVerificationMode("mfa");
        return;
      }

      setFormError(`Proses login belum selesai. Status: ${signIn.status}`);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat login.",
      );
    }
  };

  const handleVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    try {
      let verificationError: string | null = null;

      if (verificationMode === "device-trust") {
        const { error } = await signIn.mfa.verifyPhoneCode({ code });

        verificationError = error?.message ?? null;
      } else if (verificationMode === "mfa") {
        if (mfaMethod === "phone_code") {
          const { error } = await signIn.mfa.verifyPhoneCode({ code });

          verificationError = error?.message ?? null;
        } else if (mfaMethod === "totp") {
          const { error } = await signIn.mfa.verifyTOTP({ code });

          verificationError = error?.message ?? null;
        } else {
          const { error } = await signIn.mfa.verifyBackupCode({ code });

          verificationError = error?.message ?? null;
        }
      }

      if (verificationError) {
        setFormError(verificationError);
        return;
      }

      if (signIn.status === "complete") {
        await signIn.finalize();
        return;
      }

      setFormError("Verifikasi belum selesai. Silahkan coba kembali.");
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Verifikasi gagal.",
      );
    }
  };

  const handleResendCode = async () => {
    setFormError(null);

    try {
      if (verificationMode === "device-trust") {
        const { error } = await signIn.mfa.sendEmailCode();

        if (error) setFormError(error.message);
      } else if (mfaMethod === "phone_code") {
        const { error } = await signIn.mfa.sendPhoneCode();

        if (error) setFormError(error.message);
      }
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Gagal mengirim kode.",
      );
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-lamaSkyLight">
      {isLoaded && isSignedIn ? (
        <div className="bg-white p-12 rounded-md shadow-2xl">
          {typeof user?.publicMetadata?.role === "string" &&
          user?.publicMetadata?.role.trim()
            ? "Mengarahkan ke dashboard"
            : "Akun aktif, tetapi role belum di tetapkan"}
        </div>
      ) : verificationMode ? (
        // Verification Screen
        <form
          onSubmit={handleVerify}
          className="bg-white p-12 rounded-md shadow-2xl flex flex-col gap-4 w-full max-w-md"
        >
          <h1 className="text-xl font-bold">Verify your account</h1>

          <p className="text-sm text-gray-500">
            {verificationMode === "device-trust"
              ? "Masukkan kode verifikasi yang dikirim ke email kamu"
              : mfaMethod === "totp"
                ? "Masukkan kode dari aplikasi authenticator."
                : mfaMethod === "phone_code"
                  ? "Masukkan kode verifikasi yang dikirim melalui SMS."
                  : "Masukkan backup code akun kamu."}
          </p>

          <input
            type="text"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            autoComplete="one-time-code"
            required
            className="p-3 rounded-md ring-1 ring-gray-300"
            placeholder="Verification code"
          />

          {errors.fields.code && (
            <p className="text-xs text-red-400">{formError}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-500 text-wrap rounded-md text-sm p-3 disabled:opacity-50"
          >
            {isLoading ? "Verifying..." : "Verify"}
          </button>

          {(verificationMode === "device-trust" ||
            mfaMethod === "phone_code") && (
            <button
              type="button"
              onClick={handleResendCode}
              disabled={isLoading}
              className="text-sm text-blue-500"
            >
              Resend code
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              signIn.reset();
              setVerificationMode(null);
              setCode("");
              setFormError(null);
            }}
            className="text-sm text-gray-500"
          >
            Back to login
          </button>
        </form>
      ) : (
        // Login screen
        <form
          onSubmit={handleSubmit}
          className="bg-white p-12 rounded-md shadow-2xl flex flex-col gap-3 w-full max-w-md"
        >
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Image src="/logo.png" alt="logo" width={24} height={24} />
            SchoolLama
          </h1>

          <h2 className="text-gray-400">Sign in to your account</h2>

          {formError && <p className="text-sm text-red-400">{formError}</p>}

          <div className="flex flex-col gap-2">
            <label htmlFor="username" className="text-xs text-gray-500">
              Username
            </label>

            <input
              id="username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoCapitalize="username"
              required
              className="p-2 rounded-md ring-1 ring-gray-300"
              placeholder="Enter your username"
            />

            {errors.fields.identifier && (
              <p className="text-xs text-red-400">
                {errors.fields.identifier.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-xs text-gray-500">
              Password
            </label>

            <input
              id="password"
              type="text"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              className="p-2 rounded-md ring-1 ring-gray-300"
              placeholder="Enter your password"
            />

            {errors.fields.password && (
              <p className="text-xs text-red-400">
                {errors.fields.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-500 text-white my-1 rounded-md text-sm p-[10px] disabled:opacity-50"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      )}
    </div>
  );
};

export default LoginPage;

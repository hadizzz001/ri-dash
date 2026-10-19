"use client";

import axios, { AxiosError } from "axios";
import { useState } from "react";

const LOGO =
  "https://res.cloudinary.com/dtjcqfoxc/image/upload/v1746704732/cginuhwlfup2eayg6ehy.png";

const inputClass =
  "mb-4 block w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2.5 text-base text-white " +
  "placeholder-gray-500 outline-none transition focus:border-[#ab695d] focus:ring-1 focus:ring-[#ab695d]";

/** Dashboard login: a centred card that fits any screen, phone to desktop. */
export default function Home() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;

    const payload = {
      username: form.username.value.trim(),
      password: form.password.value,
    };

    setBusy(true);
    setError("");
    try {
      await axios.post("/api/auth/login", payload);
      window.location.replace("/dashboard");
    } catch (e) {
      const status = (e as AxiosError).response?.status;
      setError(
        status === 401
          ? "Wrong username or password. Please try again."
          : "Could not sign in. Please check your connection and try again."
      );
      setBusy(false);
    }
  };

  return (
    <main
      className="flex min-h-screen w-full items-center justify-center bg-black px-4 py-10 sm:px-6 [@media(max-height:500px)]:py-4"
      style={{ minHeight: "100svh" }}
    >
      <style dangerouslySetInnerHTML={{ __html: "body{background:#000}" }} />

      <div className="w-full max-w-sm">
        {/* hidden on very short screens (phones held sideways) so the form fits */}
        <img src={LOGO} alt="Rafi Daham" className="mx-auto mb-8 block h-auto w-32 sm:w-40 [@media(max-height:500px)]:hidden" />

        <form onSubmit={handleSubmit} className="rounded-xl bg-gray-900 p-6 shadow-lg sm:p-8">
          <h1 className="mb-6 text-center text-xl font-semibold text-white">Login</h1>

          <label htmlFor="username" className="mb-1.5 block text-sm text-gray-300">
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            className={inputClass}
          />

          <label htmlFor="password" className="mb-1.5 block text-sm text-gray-300">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={inputClass}
          />

          {error && (
            <p role="alert" className="mb-4 rounded-md bg-red-950/60 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-2 w-full rounded-md bg-[#ab695d] py-2.5 font-medium text-white transition hover:bg-[#924f48] disabled:cursor-wait disabled:opacity-70"
          >
            {busy ? "Signing in…" : "Login"}
          </button>
        </form>
      </div>
    </main>
  );
}

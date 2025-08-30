"use client";

import { LoginForm } from "@/components/features/auth/login-form";
import { useSupabase } from "@/lib/supabase/SupabaseProvider";
import { LoginCredentials } from "@/lib/types";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { supabase } = useSupabase();
  const router = useRouter();

  const handleLogin = async (credentials: LoginCredentials) => {
    const { error } = await supabase.auth.signInWithPassword(credentials);
    if (error) {
      alert(error.message);
    } else {
      router.push("/polls");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <LoginForm onSubmit={handleLogin} />
    </div>
  );
}

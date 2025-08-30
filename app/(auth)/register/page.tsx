"use client";

import { RegisterForm } from "@/components/features/auth/register-form";
import { useSupabase } from "@/lib/supabase/SupabaseProvider";
import { RegisterCredentials } from "@/lib/types";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const { supabase } = useSupabase();
  const router = useRouter();

  const handleRegister = async (credentials: RegisterCredentials) => {
    const { error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: {
          full_name: credentials.name,
        },
      },
    });

    if (error) {
      alert(error.message);
    } else {
      router.push("/polls");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <RegisterForm onSubmit={handleRegister} />
    </div>
  );
}

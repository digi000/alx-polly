"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PollActionResult } from "@/lib/types/poll";

interface UseApiFormOptions {
  onSuccess?: (result: PollActionResult) => void;
}

export function useApiForm(url: string, method: "POST" | "PUT", options?: UseApiFormOptions) {
  const [message, setMessage] = useState<string>("");
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const router = useRouter();

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    setMessage("");
    setIsSuccess(false);

    try {
      const response = await fetch(url, {
        method,
        body: formData,
      });

      const result: PollActionResult = await response.json();

      if (result?.success) {
        setMessage(result.message);
        setIsSuccess(true);
        if (options?.onSuccess) {
          options.onSuccess(result);
        }
      } else {
        setMessage(result?.message || "An unknown error occurred.");
        setIsSuccess(false);
      }
    } catch (error) {
      setMessage("An unexpected network error occurred.");
      setIsSuccess(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    handleSubmit,
    message,
    isSuccess,
    isSubmitting,
  };
}

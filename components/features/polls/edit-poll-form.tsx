"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const editPollSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters long"),
  description: z.string().optional(),
  options: z
    .array(z.object({ 
      id: z.string().optional(),
      text: z.string().min(1, "Option cannot be empty").transform(val => val.trim())
    }))
    .min(2, "You must provide at least two options")
    .refine(
      (options) => options.filter(opt => opt.text.length > 0).length >= 2,
      "You must provide at least two non-empty options"
    ),
});

interface PollOption {
  id: string;
  text: string;
}

interface Poll {
  id: string;
  title: string;
  description?: string;
  created_by: string;
  poll_options: PollOption[];
}

interface EditPollFormProps {
  poll: Poll;
}

export function EditPollForm({ poll }: EditPollFormProps) {
  const [message, setMessage] = useState<string>("");
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const router = useRouter();

  const form = useForm<z.infer<typeof editPollSchema>>({
    resolver: zodResolver(editPollSchema),
    defaultValues: {
      title: poll.title,
      description: poll.description || "",
      options: poll.poll_options.map(option => ({
        id: option.id,
        text: option.text
      })),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "options",
  });

  const handleFormSubmit = async (values: z.infer<typeof editPollSchema>) => {
    const formData = new FormData();
    formData.append("title", values.title);
    if (values.description) {
      formData.append("description", values.description);
    }
    
    // Filter out empty options and clean the data
    const cleanOptions = values.options
      .filter(option => option.text.trim() !== "") // Remove empty options
      .map(option => ({
        text: option.text.trim() // Trim whitespace
      }));
    
    formData.append("options", JSON.stringify(cleanOptions));

    try {
      const response = await fetch(`/api/polls/${poll.id}`, {
        method: 'PUT',
        body: formData,
      });
      const result = await response.json();
      
      if (result?.success) {
        setMessage(result.message);
        setIsSuccess(true);
        
        // Redirect after showing success message
        setTimeout(() => {
          router.push(`/polls/${poll.id}`);
        }, 2000);
      } else if (result?.message) {
        setMessage(result.message);
        setIsSuccess(false);
      }
    } catch (error) {
      setMessage("An unexpected error occurred.");
      setIsSuccess(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/polls/${poll.id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Poll
          </Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="outline" size="sm">
            Dashboard
          </Button>
        </Link>
      </div>

      {message && (
        <div
          className={`p-4 rounded-md ${
            isSuccess
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message}
          {isSuccess && (
            <div className="text-sm mt-1">
              Redirecting to your poll in 2 seconds...
            </div>
          )}
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <h3 className="font-medium text-yellow-800 mb-1">Important Notice</h3>
        <p className="text-sm text-yellow-700">
          Editing this poll will remove all existing votes. This action cannot be undone.
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleFormSubmit)}
          className="space-y-8"
        >
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Poll Title</FormLabel>
                <FormControl>
                  <Input placeholder="What's your favorite color?" {...field} />
                </FormControl>
                <FormDescription>
                  This is the main question for your poll.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="A brief description of your poll."
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div>
            <FormLabel>Options</FormLabel>
            <div className="space-y-4 mt-2">
              {fields.map((field, index) => (
                <FormField
                  key={field.id}
                  control={form.control}
                  name={`options.${index}.text`}
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Input placeholder={`Option ${index + 1}`} {...field} />
                        </FormControl>
                        {fields.length > 2 && (
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={() => remove(index)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => append({ text: "" })}
            >
              Add Option
            </Button>
          </div>

          <div className="flex gap-4">
            <Button 
              type="submit" 
              disabled={form.formState.isSubmitting}
              onClick={() => {
                // Remove any empty options before validation
                const currentOptions = form.getValues("options");
                const nonEmptyOptions = currentOptions.filter(option => option.text.trim() !== "");
                form.setValue("options", nonEmptyOptions);
              }}
            >
              {form.formState.isSubmitting ? "Updating Poll..." : "Update Poll"}
            </Button>
            <Link href={`/polls/${poll.id}`}>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </Form>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, LogIn } from "lucide-react";

interface PollOption {
  id: string;
  text: string;
  vote_count: number;
}

interface Poll {
  id: string;
  title: string;
  description?: string;
  created_at: string;
  poll_options: PollOption[];
  total_votes: number;
}

interface PublicPollsContentProps {
  polls: Poll[];
}

export function PublicPollsContent({ polls }: PublicPollsContentProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (polls.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-600 mb-2">
            No polls available
          </h2>
          <p className="text-gray-500 mb-6">
            Be the first to create a poll!
          </p>
        </div>
        <div className="space-y-3">
          <Link href="/login">
            <Button className="inline-flex items-center gap-2">
              <LogIn className="h-4 w-4" />
              Login to Create Polls
            </Button>
          </Link>
          <div className="text-sm text-gray-500">
            Already have an account? Sign in to create and manage your polls.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Browse All Polls</h2>
          <p className="text-gray-600">
            {polls.length} poll{polls.length !== 1 ? "s" : ""} available
          </p>
        </div>
        <Link href="/login">
          <Button variant="outline" className="inline-flex items-center gap-2">
            <LogIn className="h-4 w-4" />
            Login to Create Polls
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {polls.map((poll) => (
          <Card key={poll.id} className="flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-2">{poll.title}</CardTitle>
                  {poll.description && (
                    <CardDescription className="line-clamp-2">
                      {poll.description}
                    </CardDescription>
                  )}
                </div>
                <Badge variant="secondary" className="ml-2">
                  {poll.total_votes} vote{poll.total_votes !== 1 ? "s" : ""}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="flex-1">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  Options ({poll.poll_options.length}):
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  {poll.poll_options.slice(0, 3).map((option) => (
                    <li key={option.id} className="flex justify-between">
                      <span className="truncate">{option.text}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        {option.vote_count}
                      </span>
                    </li>
                  ))}
                  {poll.poll_options.length > 3 && (
                    <li className="text-xs text-gray-500">
                      +{poll.poll_options.length - 3} more options
                    </li>
                  )}
                </ul>
              </div>
            </CardContent>

            <CardFooter className="pt-4 border-t">
              <div className="w-full space-y-3">
                <div className="text-xs text-gray-500">
                  Created {formatDate(poll.created_at)}
                </div>
                <div className="flex gap-2">
                  <Link href={`/polls/${poll.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      <Eye className="h-4 w-4 mr-2" />
                      View & Vote
                    </Button>
                  </Link>
                  <Link href="/login" className="flex-1">
                    <Button size="sm" className="w-full">
                      <LogIn className="h-4 w-4 mr-2" />
                      Login
                    </Button>
                  </Link>
                </div>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      <div className="text-center py-8 border-t">
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Want to create your own polls?</h3>
          <p className="text-gray-600">
            Sign in to create polls, manage your content, and track votes.
          </p>
          <Link href="/login">
            <Button className="inline-flex items-center gap-2">
              <LogIn className="h-4 w-4" />
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

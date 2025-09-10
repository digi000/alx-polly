"use client";

import { useState } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Eye, Plus } from "lucide-react";
import { deletePoll } from "@/lib/actions";

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
  created_by: string;
  poll_options: PollOption[];
  total_votes: number;
}

interface DashboardContentProps {
  polls: Poll[];
  userId: string;
}

export function DashboardContent({ polls, userId }: DashboardContentProps) {
  const [deletingPollId, setDeletingPollId] = useState<string | null>(null);

  const handleDeletePoll = async (pollId: string) => {
    setDeletingPollId(pollId);
    try {
      await deletePoll(pollId);
      // The page will revalidate and show updated data
    } catch (error) {
      console.error("Error deleting poll:", error);
    } finally {
      setDeletingPollId(null);
    }
  };

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
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-600 mb-2">
            No polls yet
          </h2>
          <p className="text-gray-500 mb-6">
            Create your first poll to get started!
          </p>
        </div>
        <Link href="/polls/create">
          <Button className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Your First Poll
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Your Polls</h2>
          <p className="text-gray-600">
            {polls.length} poll{polls.length !== 1 ? "s" : ""} created
          </p>
        </div>
        <Link href="/polls/create">
          <Button className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create New Poll
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
                      View
                    </Button>
                  </Link>
                  <Link href={`/polls/${poll.id}/edit`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </Link>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        disabled={deletingPollId === poll.id}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {deletingPollId === poll.id ? "..." : "Delete"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Poll</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{poll.title}"? This
                          action cannot be undone and will permanently remove
                          the poll and all its votes.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeletePoll(poll.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete Poll
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

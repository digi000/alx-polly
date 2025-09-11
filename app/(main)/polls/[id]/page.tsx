"use client";

import { useState, useEffect } from "react";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

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
  total_votes: number;
  user_vote: string | null;
  options: PollOption[];
}

async function getPoll(id: string): Promise<Poll | null> {
  const res = await fetch(`/api/polls/${id}`);
  if (!res.ok) {
    return null;
  }
  return res.json();
}

export default function PollPage({ params }: { params: { id: string } }) {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPoll(params.id).then(data => {
      setPoll(data);
      setIsLoading(false);
    }).catch(() => {
      setError("Failed to load poll.");
      setIsLoading(false);
    });
  }, [params.id]);

  const handleVote = async () => {
    if (!selectedOption) return;

    const res = await fetch(`/api/polls/${params.id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionId: selectedOption }),
    });

    if (res.ok) {
      getPoll(params.id).then(setPoll);
    } else {
      setError("Failed to cast vote.");
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!poll) {
    notFound();
  }

  const hasVoted = poll.user_vote !== null;

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{poll.title}</CardTitle>
          {poll.description && (
            <p className="text-gray-600 dark:text-gray-400">
              {poll.description}
            </p>
          )}
          <div className="flex gap-2">
            <Badge variant="secondary">
              Created: {new Date(poll.created_at).toLocaleDateString()}
            </Badge>
            <Badge variant="secondary">{poll.total_votes} votes</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Options:</h3>
            {hasVoted ? (
              <div className="space-y-2">
                {poll.options.map((option) => {
                  const percentage = poll.total_votes > 0 ? (option.vote_count / poll.total_votes) * 100 : 0;
                  return (
                    <div key={option.id} className="relative p-3 border rounded-lg">
                      <div
                        className="absolute top-0 left-0 h-full bg-blue-100 dark:bg-blue-900 rounded-lg"
                        style={{ width: `${percentage}%` }}
                      ></div>
                      <div className="relative flex justify-between">
                        <span className="font-medium">{option.text}</span>
                        <span>{option.vote_count} ({percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <RadioGroup onValueChange={setSelectedOption}>
                <div className="space-y-2">
                  {poll.options.map((option) => (
                    <div key={option.id} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.id} id={option.id} />
                      <Label htmlFor={option.id}>{option.text}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            )}
            {!hasVoted && (
              <Button onClick={handleVote} disabled={!selectedOption}>
                Vote
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
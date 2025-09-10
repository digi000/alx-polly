export interface Poll {
  id: string;
  title: string;
  description?: string;
  options: PollOption[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  allowMultipleVotes: boolean;
  totalVotes: number;
}

export interface PollOption {
  id?: string;
  text: string;
  votes?: number;
  pollId?: string;
  poll_id?: string; // For database compatibility
}

export interface Vote {
  id: string;
  pollId: string;
  optionId: string;
  userId: string;
  createdAt: Date;
}

export interface CreatePollData {
  title: string;
  description?: string;
  options: PollOption[];
  expiresAt?: Date;
  allowMultipleVotes?: boolean;
}

export interface UpdatePollData extends CreatePollData {
  id: string;
}

export interface PollActionResult {
  success?: boolean;
  message: string;
  pollId?: string;
  errors?: Record<string, string[]>;
}

export interface PollPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canView: boolean;
}

export interface PollStats {
  totalPolls: number;
  totalVotes: number;
  activePolls: number;
  recentPolls: Poll[];
}

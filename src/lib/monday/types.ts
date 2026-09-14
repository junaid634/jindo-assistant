export type MondayBoard = {
  id: string;
  name: string;
  items_count?: number | null;
};

export type MondayColumnValue = {
  id: string;
  text: string | null;
  type?: string;
  value?: string | null;
};

export type MondayItem = {
  id: string;
  name: string;
  created_at?: string;
  updated_at?: string;
  column_values: MondayColumnValue[];
  board?: { id: string; name?: string };
};

export type TaskView = {
  id: string;
  name: string;
  boardId: string;
  boardName?: string;
  owner: string | null;
  ownerIds: string[];
  status: string | null;
  dueDate: string | null;
  updatedAt?: string;
  stale: boolean;
  overdue: boolean;
};

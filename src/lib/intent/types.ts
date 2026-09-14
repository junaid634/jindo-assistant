export type IntentName =
  | 'list_boards'
  | 'list_tasks'
  | 'who_owns'
  | 'assign_task'
  | 'update_task'
  | 'overdue'
  | 'report'
  | 'text_tasks'
  | 'send_sms'
  | 'list_calendar'
  | 'create_meeting'
  | 'help'
  | 'unknown';

export type ParsedIntent = {
  intent: IntentName;
  confidence: number;
  person?: string;
  taskQuery?: string;
  status?: string;
  title?: string;
  when?: string;
  durationMinutes?: number;
  content?: string;
  boardId?: string;
  raw: string;
};

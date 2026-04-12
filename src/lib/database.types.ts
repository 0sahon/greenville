/**
 * Application-facing `Database` type: starts from Supabase codegen (`database.generated.ts`)
 * and narrows a few text columns where SQL uses CHECK constraints or documented enums
 * but `gen types` still emits `string`.
 *
 * After schema changes: `npm run gen:db-types` then fix any conflicts here.
 */
import type { Database as GeneratedDatabase, Json } from './database.generated';

export type { Json };

/** `admission_applications.status` — workflow values documented in migration SQL. */
export type AdmissionApplicationStatus =
  | 'pending'
  | 'reviewed'
  | 'approved'
  | 'rejected'
  | 'enrolled';

/** Broadcast messages: `messages.target_role` — see migration comments / RLS. */
export type MessageTargetRole = 'parent' | 'teacher' | 'all';

/** `cbt_questions.correct_option` / `cbt_answers.selected_option` — CHECK IN ('a','b','c','d'). */
export type CbtMcqOption = 'a' | 'b' | 'c' | 'd';

type GenTables = GeneratedDatabase['public']['Tables'];

type AdmissionApplicationsTable = Omit<
  GenTables['admission_applications'],
  'Row' | 'Insert' | 'Update'
> & {
  Row: Omit<GenTables['admission_applications']['Row'], 'status'> & {
    status: AdmissionApplicationStatus;
  };
  Insert: Omit<GenTables['admission_applications']['Insert'], 'status'> & {
    status?: AdmissionApplicationStatus;
  };
  Update: Omit<GenTables['admission_applications']['Update'], 'status'> & {
    status?: AdmissionApplicationStatus;
  };
};

type MessagesTable = Omit<GenTables['messages'], 'Row' | 'Insert' | 'Update'> & {
  Row: Omit<GenTables['messages']['Row'], 'target_role'> & {
    target_role: MessageTargetRole | null;
  };
  Insert: Omit<GenTables['messages']['Insert'], 'target_role'> & {
    target_role?: MessageTargetRole | null;
  };
  Update: Omit<GenTables['messages']['Update'], 'target_role'> & {
    target_role?: MessageTargetRole | null;
  };
};

type CbtQuestionsTable = Omit<GenTables['cbt_questions'], 'Row' | 'Insert' | 'Update'> & {
  Row: Omit<GenTables['cbt_questions']['Row'], 'correct_option'> & {
    correct_option: CbtMcqOption;
  };
  Insert: Omit<GenTables['cbt_questions']['Insert'], 'correct_option'> & {
    correct_option: CbtMcqOption;
  };
  Update: Omit<GenTables['cbt_questions']['Update'], 'correct_option'> & {
    correct_option?: CbtMcqOption;
  };
};

type CbtAnswersTable = Omit<GenTables['cbt_answers'], 'Row' | 'Insert' | 'Update'> & {
  Row: Omit<GenTables['cbt_answers']['Row'], 'selected_option'> & {
    selected_option: CbtMcqOption | null;
  };
  Insert: Omit<GenTables['cbt_answers']['Insert'], 'selected_option'> & {
    selected_option?: CbtMcqOption | null;
  };
  Update: Omit<GenTables['cbt_answers']['Update'], 'selected_option'> & {
    selected_option?: CbtMcqOption | null;
  };
};

export type Database = Omit<GeneratedDatabase, 'public'> & {
  public: Omit<GeneratedDatabase['public'], 'Tables'> & {
    Tables: Omit<
      GenTables,
      'admission_applications' | 'messages' | 'cbt_questions' | 'cbt_answers'
    > & {
      admission_applications: AdmissionApplicationsTable;
      messages: MessagesTable;
      cbt_questions: CbtQuestionsTable;
      cbt_answers: CbtAnswersTable;
    };
  };
};

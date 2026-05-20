import { useState } from 'react';
import { TableProperties, FileSpreadsheet, List } from 'lucide-react';
import type { ProfileRow } from '../../../lib/supabase';
import GradeSheetTab from './GradeSheetTab';
import RecordsViewTab from './RecordsViewTab';
import DatasheetEntryTab from './DatasheetEntryTab';

interface Props { profile: ProfileRow; onNavigate?: (s: string) => void; }

export default function GradesSection({ profile }: Props) {
  const [tab, setTab] = useState<'sheet' | 'datasheet' | 'records'>('sheet');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Grades</h2>
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {([
            { key: 'sheet',     label: 'Grade Sheet',     icon: TableProperties },
            { key: 'datasheet', label: 'Datasheet Entry', icon: FileSpreadsheet },
            { key: 'records',   label: 'View Records',    icon: List },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'sheet'     && <GradeSheetTab     profile={profile} />}
      {tab === 'datasheet' && <DatasheetEntryTab  profile={profile} />}
      {tab === 'records'   && <RecordsViewTab     profile={profile} />}
    </div>
  );
}

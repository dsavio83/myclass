import React from 'react';
import { useApi } from '../hooks/useApi';
import { getClasses, getSubjectsByClassId, getUnitsBySubjectId, getSubUnitsByUnitId, getLessonsBySubUnitId } from '../services/api';
import { Class, Subject, Unit, SubUnit, Lesson } from '../types';

interface CascadeSelectorsProps {
  classId: string | null;
  subjectId: string | null;
  unitId: string | null;
  subUnitId: string | null;
  lessonId: string | null;
  onClassChange: (id: string | null) => void;
  onSubjectChange: (id: string | null) => void;
  onUnitChange: (id: string | null) => void;
  onSubUnitChange: (id: string | null) => void;
  onLessonChange: (id: string | null) => void;
}

const Selector: React.FC<{
  label: string;
  value: string | null;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { _id: string; name: string }[] | null;
  isLoading: boolean;
  disabled: boolean;
}> = ({ label, value, onChange, options, isLoading, disabled }) => (
  <div className="relative flex-1 min-w-[150px]">
    <select
      value={value || ''}
      onChange={onChange}
      disabled={disabled || isLoading}
      className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
    >
      <option value="" disabled>{isLoading ? 'Loading...' : `Select ${label}`}</option>
      {options?.map(opt => (
        <option key={opt._id} value={opt._id}>{opt.name}</option>
      ))}
    </select>
  </div>
);

export const CascadeSelectors: React.FC<CascadeSelectorsProps> = ({
  classId,
  subjectId,
  unitId,
  subUnitId,
  lessonId,
  onClassChange,
  onSubjectChange,
  onUnitChange,
  onSubUnitChange,
  onLessonChange,
}) => {
  const { data: classes, isLoading: isLoadingClasses } = useApi<Class[]>(getClasses, []);
  const { data: subjects, isLoading: isLoadingSubjects } = useApi<Subject[]>(
    () => getSubjectsByClassId(classId!),
    [classId],
    !!classId
  );
  const { data: units, isLoading: isLoadingUnits } = useApi<Unit[]>(
    () => getUnitsBySubjectId(subjectId!),
    [subjectId],
    !!subjectId
  );
  const { data: subUnits, isLoading: isLoadingSubUnits } = useApi<SubUnit[]>(
    () => getSubUnitsByUnitId(unitId!),
    [unitId],
    !!unitId
  );
  const { data: lessons, isLoading: isLoadingLessons } = useApi<Lesson[]>(
    () => getLessonsBySubUnitId(subUnitId!),
    [subUnitId],
    !!subUnitId
  );

  return (
    <div className="p-4 bg-white dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 shrink-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Selector
                label="Class"
                value={classId}
                onChange={(e) => onClassChange(e.target.value || null)}
                options={classes}
                isLoading={isLoadingClasses}
                disabled={false}
            />
            <Selector
                label="Subject"
                value={subjectId}
                onChange={(e) => onSubjectChange(e.target.value || null)}
                options={subjects}
                isLoading={isLoadingSubjects}
                disabled={!classId}
            />
            <Selector
                label="Unit"
                value={unitId}
                onChange={(e) => onUnitChange(e.target.value || null)}
                options={units}
                isLoading={isLoadingUnits}
                disabled={!subjectId}
            />
            <Selector
                label="Sub-Unit"
                value={subUnitId}
                onChange={(e) => onSubUnitChange(e.target.value || null)}
                options={subUnits}
                isLoading={isLoadingSubUnits}
                disabled={!unitId}
            />
            <Selector
                label="Chapter"
                value={lessonId}
                onChange={(e) => onLessonChange(e.target.value || null)}
                options={lessons}
                isLoading={isLoadingLessons}
                disabled={!subUnitId}
            />
        </div>
    </div>
  );
};
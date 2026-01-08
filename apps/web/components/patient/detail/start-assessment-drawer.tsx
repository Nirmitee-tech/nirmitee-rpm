'use client';

import { useState } from 'react';
import { X, Loader2, ChevronRight, ChevronLeft, CheckCircle2, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/lib/i18n/i18n-context';
import { patientsApi, type AssessmentType } from '@/lib/api/patients';
import { cn } from '@/lib/utils';

interface StartAssessmentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  onAssessmentCreated: () => void;
  preselectedType?: AssessmentType;
}

// Assessment type configuration with questions
const ASSESSMENT_CONFIG: Record<AssessmentType, {
  title: string;
  description: string;
  maxScore: number;
  questions: { id: string; text: string; options: { value: number; label: string }[] }[];
}> = {
  PHQ9: {
    title: 'PHQ-9',
    description: 'Patient Health Questionnaire for Depression',
    maxScore: 27,
    questions: [
      { id: 'q1', text: 'Little interest or pleasure in doing things', options: [{ value: 0, label: 'Not at all' }, { value: 1, label: 'Several days' }, { value: 2, label: 'More than half the days' }, { value: 3, label: 'Nearly every day' }] },
      { id: 'q2', text: 'Feeling down, depressed, or hopeless', options: [{ value: 0, label: 'Not at all' }, { value: 1, label: 'Several days' }, { value: 2, label: 'More than half the days' }, { value: 3, label: 'Nearly every day' }] },
      { id: 'q3', text: 'Trouble falling or staying asleep, or sleeping too much', options: [{ value: 0, label: 'Not at all' }, { value: 1, label: 'Several days' }, { value: 2, label: 'More than half the days' }, { value: 3, label: 'Nearly every day' }] },
      { id: 'q4', text: 'Feeling tired or having little energy', options: [{ value: 0, label: 'Not at all' }, { value: 1, label: 'Several days' }, { value: 2, label: 'More than half the days' }, { value: 3, label: 'Nearly every day' }] },
      { id: 'q5', text: 'Poor appetite or overeating', options: [{ value: 0, label: 'Not at all' }, { value: 1, label: 'Several days' }, { value: 2, label: 'More than half the days' }, { value: 3, label: 'Nearly every day' }] },
      { id: 'q6', text: 'Feeling bad about yourself', options: [{ value: 0, label: 'Not at all' }, { value: 1, label: 'Several days' }, { value: 2, label: 'More than half the days' }, { value: 3, label: 'Nearly every day' }] },
      { id: 'q7', text: 'Trouble concentrating on things', options: [{ value: 0, label: 'Not at all' }, { value: 1, label: 'Several days' }, { value: 2, label: 'More than half the days' }, { value: 3, label: 'Nearly every day' }] },
      { id: 'q8', text: 'Moving or speaking slowly, or being fidgety/restless', options: [{ value: 0, label: 'Not at all' }, { value: 1, label: 'Several days' }, { value: 2, label: 'More than half the days' }, { value: 3, label: 'Nearly every day' }] },
      { id: 'q9', text: 'Thoughts of hurting yourself or being better off dead', options: [{ value: 0, label: 'Not at all' }, { value: 1, label: 'Several days' }, { value: 2, label: 'More than half the days' }, { value: 3, label: 'Nearly every day' }] },
    ],
  },
  GAD7: {
    title: 'GAD-7',
    description: 'Generalized Anxiety Disorder Assessment',
    maxScore: 21,
    questions: [
      { id: 'q1', text: 'Feeling nervous, anxious, or on edge', options: [{ value: 0, label: 'Not at all' }, { value: 1, label: 'Several days' }, { value: 2, label: 'More than half the days' }, { value: 3, label: 'Nearly every day' }] },
      { id: 'q2', text: 'Not being able to stop or control worrying', options: [{ value: 0, label: 'Not at all' }, { value: 1, label: 'Several days' }, { value: 2, label: 'More than half the days' }, { value: 3, label: 'Nearly every day' }] },
      { id: 'q3', text: 'Worrying too much about different things', options: [{ value: 0, label: 'Not at all' }, { value: 1, label: 'Several days' }, { value: 2, label: 'More than half the days' }, { value: 3, label: 'Nearly every day' }] },
      { id: 'q4', text: 'Trouble relaxing', options: [{ value: 0, label: 'Not at all' }, { value: 1, label: 'Several days' }, { value: 2, label: 'More than half the days' }, { value: 3, label: 'Nearly every day' }] },
      { id: 'q5', text: 'Being so restless that it is hard to sit still', options: [{ value: 0, label: 'Not at all' }, { value: 1, label: 'Several days' }, { value: 2, label: 'More than half the days' }, { value: 3, label: 'Nearly every day' }] },
      { id: 'q6', text: 'Becoming easily annoyed or irritable', options: [{ value: 0, label: 'Not at all' }, { value: 1, label: 'Several days' }, { value: 2, label: 'More than half the days' }, { value: 3, label: 'Nearly every day' }] },
      { id: 'q7', text: 'Feeling afraid as if something awful might happen', options: [{ value: 0, label: 'Not at all' }, { value: 1, label: 'Several days' }, { value: 2, label: 'More than half the days' }, { value: 3, label: 'Nearly every day' }] },
    ],
  },
  FALLS_RISK: {
    title: 'Falls Risk',
    description: 'Fall Risk Assessment',
    maxScore: 10,
    questions: [
      { id: 'q1', text: 'History of falls in the past year', options: [{ value: 0, label: 'No falls' }, { value: 1, label: '1 fall' }, { value: 2, label: '2 or more falls' }] },
      { id: 'q2', text: 'Secondary diagnosis affecting mobility', options: [{ value: 0, label: 'No' }, { value: 1, label: 'Yes' }] },
      { id: 'q3', text: 'Ambulatory aids used', options: [{ value: 0, label: 'None/Bed rest' }, { value: 1, label: 'Crutches/Cane/Walker' }, { value: 2, label: 'Furniture' }] },
      { id: 'q4', text: 'IV/Heparin lock', options: [{ value: 0, label: 'No' }, { value: 1, label: 'Yes' }] },
      { id: 'q5', text: 'Gait/Transferring impairment', options: [{ value: 0, label: 'Normal/Bed rest' }, { value: 1, label: 'Weak' }, { value: 2, label: 'Impaired' }] },
      { id: 'q6', text: 'Mental status', options: [{ value: 0, label: 'Oriented to own ability' }, { value: 1, label: 'Forgets limitations' }] },
    ],
  },
  PAIN_SCALE: {
    title: 'Pain Scale',
    description: 'Pain Assessment Scale',
    maxScore: 10,
    questions: [
      { id: 'q1', text: 'Current pain level (0-10)', options: Array.from({ length: 11 }, (_, i) => ({ value: i, label: `${i}${i === 0 ? ' (No pain)' : i === 10 ? ' (Worst pain)' : ''}` })) },
    ],
  },
  NUTRITION: {
    title: 'Nutrition',
    description: 'Nutritional Status Assessment',
    maxScore: 100,
    questions: [
      { id: 'q1', text: 'Unintentional weight loss in past 3-6 months', options: [{ value: 0, label: 'None' }, { value: 10, label: '< 5%' }, { value: 20, label: '5-10%' }, { value: 30, label: '> 10%' }] },
      { id: 'q2', text: 'Reduced food intake past week', options: [{ value: 0, label: 'Normal' }, { value: 10, label: 'Slightly reduced' }, { value: 20, label: 'Significantly reduced' }, { value: 30, label: 'Almost none' }] },
      { id: 'q3', text: 'BMI category', options: [{ value: 0, label: 'Normal (18.5-24.9)' }, { value: 10, label: 'Overweight (25-29.9)' }, { value: 20, label: 'Underweight (<18.5)' }, { value: 30, label: 'Obese (>30)' }] },
      { id: 'q4', text: 'Disease severity', options: [{ value: 0, label: 'Mild' }, { value: 5, label: 'Moderate' }, { value: 10, label: 'Severe' }] },
    ],
  },
  ADL: {
    title: 'ADL',
    description: 'Activities of Daily Living Assessment',
    maxScore: 100,
    questions: [
      { id: 'bathing', text: 'Bathing', options: [{ value: 0, label: 'Dependent' }, { value: 5, label: 'Requires assistance' }, { value: 10, label: 'Independent' }] },
      { id: 'dressing', text: 'Dressing', options: [{ value: 0, label: 'Dependent' }, { value: 5, label: 'Requires assistance' }, { value: 10, label: 'Independent' }] },
      { id: 'grooming', text: 'Grooming', options: [{ value: 0, label: 'Dependent' }, { value: 5, label: 'Requires assistance' }, { value: 10, label: 'Independent' }] },
      { id: 'toileting', text: 'Toileting', options: [{ value: 0, label: 'Dependent' }, { value: 5, label: 'Requires assistance' }, { value: 10, label: 'Independent' }] },
      { id: 'transferring', text: 'Transferring', options: [{ value: 0, label: 'Dependent' }, { value: 5, label: 'Requires assistance' }, { value: 10, label: 'Independent' }] },
      { id: 'continence', text: 'Continence', options: [{ value: 0, label: 'Incontinent' }, { value: 5, label: 'Occasional accident' }, { value: 10, label: 'Continent' }] },
      { id: 'feeding', text: 'Feeding', options: [{ value: 0, label: 'Dependent' }, { value: 5, label: 'Requires assistance' }, { value: 10, label: 'Independent' }] },
      { id: 'mobility', text: 'Mobility', options: [{ value: 0, label: 'Immobile' }, { value: 5, label: 'Wheelchair independent' }, { value: 10, label: 'Walks with help' }, { value: 15, label: 'Independent' }] },
      { id: 'stairs', text: 'Stairs', options: [{ value: 0, label: 'Unable' }, { value: 5, label: 'Needs help' }, { value: 10, label: 'Independent' }] },
    ],
  },
};

const ASSESSMENT_TYPES: AssessmentType[] = ['PHQ9', 'GAD7', 'FALLS_RISK', 'PAIN_SCALE', 'NUTRITION', 'ADL'];

export function StartAssessmentDrawer({
  isOpen,
  onClose,
  patientId,
  onAssessmentCreated,
  preselectedType,
}: StartAssessmentDrawerProps) {
  const { t } = useTranslations('assessment');
  const { t: tCommon } = useTranslations('common');

  // State
  const [step, setStep] = useState<'select' | 'questions' | 'review'>(preselectedType ? 'questions' : 'select');
  const [selectedType, setSelectedType] = useState<AssessmentType | null>(preselectedType || null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = selectedType ? ASSESSMENT_CONFIG[selectedType] : null;
  const questions = config?.questions || [];
  const totalQuestions = questions.length;

  // Calculate current score
  const calculateScore = () => {
    return Object.values(responses).reduce((sum, val) => sum + val, 0);
  };

  // Get score interpretation
  const getScoreInterpretation = () => {
    if (!selectedType || !config) return null;
    const score = calculateScore();

    if (selectedType === 'PHQ9') {
      if (score <= 4) return { level: t('levelMinimal'), color: 'text-green-600' };
      if (score <= 9) return { level: t('levelMild'), color: 'text-yellow-600' };
      if (score <= 14) return { level: t('levelModerate'), color: 'text-orange-600' };
      if (score <= 19) return { level: t('levelModeratelySevere'), color: 'text-red-600' };
      return { level: t('levelSevere'), color: 'text-red-700' };
    }
    if (selectedType === 'GAD7') {
      if (score <= 4) return { level: t('levelMinimal'), color: 'text-green-600' };
      if (score <= 9) return { level: t('levelMild'), color: 'text-yellow-600' };
      if (score <= 14) return { level: t('levelModerate'), color: 'text-orange-600' };
      return { level: t('levelSevere'), color: 'text-red-700' };
    }
    if (selectedType === 'PAIN_SCALE') {
      if (score <= 3) return { level: t('painMild'), color: 'text-green-600' };
      if (score <= 6) return { level: t('painModerate'), color: 'text-yellow-600' };
      return { level: t('painSevere'), color: 'text-red-600' };
    }
    if (selectedType === 'FALLS_RISK') {
      if (score <= 3) return { level: t('riskLow'), color: 'text-green-600' };
      if (score <= 6) return { level: t('riskModerate'), color: 'text-yellow-600' };
      return { level: t('riskHigh'), color: 'text-red-600' };
    }
    return null;
  };

  const handleSelectType = (type: AssessmentType) => {
    setSelectedType(type);
    setResponses({});
    setCurrentQuestion(0);
    setStep('questions');
  };

  const handleAnswer = (questionId: string, value: number) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleNext = () => {
    if (currentQuestion < totalQuestions - 1) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      setStep('review');
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    } else if (step === 'questions') {
      setStep('select');
    } else if (step === 'review') {
      setCurrentQuestion(totalQuestions - 1);
      setStep('questions');
    }
  };

  const handleSubmit = async () => {
    if (!selectedType || !config) return;

    setIsLoading(true);
    setError(null);

    try {
      // First create the assessment
      const assessment = await patientsApi.createAssessment(patientId, {
        type: selectedType,
      });

      // Then complete it with responses and score
      await patientsApi.completeAssessment(patientId, assessment.id, {
        responses,
        score: calculateScore(),
        notes: notes || undefined,
      });

      onAssessmentCreated();
      handleClose();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create assessment';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep(preselectedType ? 'questions' : 'select');
    setSelectedType(preselectedType || null);
    setCurrentQuestion(0);
    setResponses({});
    setNotes('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  const currentQuestionData = questions[currentQuestion];
  const isCurrentAnswered = currentQuestionData ? responses[currentQuestionData.id] !== undefined : false;
  const answeredCount = Object.keys(responses).length;
  const interpretation = getScoreInterpretation();

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-900 h-full overflow-hidden flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[#745EE1]" />
            <h2 className="text-lg font-semibold">
              {step === 'select' ? t('selectAssessmentType') : config?.title}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Step 1: Select Assessment Type */}
          {step === 'select' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {t('selectAssessmentDescription')}
              </p>
              {ASSESSMENT_TYPES.map((type) => {
                const typeConfig = ASSESSMENT_CONFIG[type];
                return (
                  <button
                    key={type}
                    onClick={() => handleSelectType(type)}
                    className="w-full p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-[#745EE1] hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {typeConfig.title}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {typeConfig.description}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {typeConfig.questions.length} {t('questions')} | {t('maxScore')}: {typeConfig.maxScore}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Step 2: Questions */}
          {step === 'questions' && currentQuestionData && (
            <div className="space-y-6">
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    {t('question')} {currentQuestion + 1} {t('of')} {totalQuestions}
                  </span>
                  <span className="text-gray-500">
                    {answeredCount}/{totalQuestions} {t('answered')}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#745EE1] transition-all duration-300"
                    style={{ width: `${((currentQuestion + 1) / totalQuestions) * 100}%` }}
                  />
                </div>
              </div>

              {/* Question */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  {currentQuestionData.text}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-2">
                {currentQuestionData.options.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleAnswer(currentQuestionData.id, option.value)}
                    className={cn(
                      'w-full p-3 rounded-lg border text-left transition-colors',
                      responses[currentQuestionData.id] === option.value
                        ? 'border-[#745EE1] bg-purple-50 dark:bg-purple-900/30 text-[#745EE1]'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                          responses[currentQuestionData.id] === option.value
                            ? 'border-[#745EE1] bg-[#745EE1]'
                            : 'border-gray-300 dark:border-gray-600'
                        )}
                      >
                        {responses[currentQuestionData.id] === option.value && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                      <span className="text-sm">{option.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 'review' && config && (
            <div className="space-y-6">
              {/* Score Summary */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 text-center">
                <p className="text-sm text-gray-500 mb-2">{t('totalScore')}</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    {calculateScore()}
                  </span>
                  <span className="text-lg text-gray-500">/ {config.maxScore}</span>
                </div>
                {interpretation && (
                  <p className={cn('text-lg font-medium mt-2', interpretation.color)}>
                    {interpretation.level}
                  </p>
                )}
              </div>

              {/* Responses Summary */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                  {t('responseSummary')}
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {questions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-gray-800 text-sm"
                    >
                      <span className="text-gray-600 dark:text-gray-400 truncate flex-1 mr-2">
                        {idx + 1}. {q.text}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {responses[q.id] ?? '-'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('additionalNotes')} ({tCommon('optional')})
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#745EE1] focus:border-transparent"
                  placeholder={t('notesPlaceholder')}
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            {step !== 'select' ? (
              <Button variant="outline" size="sm" onClick={handlePrev} disabled={isLoading}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                {tCommon('back')}
              </Button>
            ) : (
              <div />
            )}

            {step === 'questions' && (
              <Button
                size="sm"
                onClick={handleNext}
                disabled={!isCurrentAnswered}
                className="bg-[#745EE1] hover:bg-[#5d4bc4]"
              >
                {currentQuestion < totalQuestions - 1 ? tCommon('next') : t('reviewResults')}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}

            {step === 'review' && (
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isLoading}
                className="bg-[#745EE1] hover:bg-[#5d4bc4]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    {tCommon('saving')}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    {t('completeAssessment')}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

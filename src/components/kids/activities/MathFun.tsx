import { useState, useEffect, useRef } from 'react';
import { Star, Heart, Trophy, ArrowLeft } from 'lucide-react';
import { useSounds } from '../../../hooks/useSounds';

interface MathFunProps {
  onBack: () => void;
  onCorrectAnswer?: (solveMs: number) => void;
}

export default function MathFun({ onBack, onCorrectAnswer }: MathFunProps) {
  const { correct, incorrect, click } = useSounds();
  const [currentProblem, setCurrentProblem] = useState({ num1: 0, num2: 0, answer: 0 });
  const [userAnswer, setUserAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const problemStartTime = useRef<number>(Date.now());

  useEffect(() => {
    generateNewProblem();
  }, []);

  const generateNewProblem = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    setCurrentProblem({ num1, num2, answer: num1 + num2 });
    setUserAnswer('');
    setFeedback('');
    problemStartTime.current = Date.now();
  };

  const checkAnswer = () => {
    const answer = parseInt(userAnswer);
    if (answer === currentProblem.answer) {
      const solveMs = Date.now() - problemStartTime.current;
      correct();
      setScore(score + 1);
      onCorrectAnswer?.(solveMs);
      setFeedback('🎉 Amazing! You got it right!');
      setShowCelebration(true);
      setTimeout(() => {
        setShowCelebration(false);
        generateNewProblem();
      }, 2000);
    } else {
      incorrect();
      setFeedback(`🤔 Not quite! The answer is ${currentProblem.answer}. Try the next one!`);
      setTimeout(() => {
        generateNewProblem();
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-200 via-purple-200 to-pink-200 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 bg-white hover:bg-gray-50 px-4 py-3 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105"
        >
          <ArrowLeft className="w-6 h-6 text-purple-600" />
          <span className="text-purple-600 font-bold text-lg">Back</span>
        </button>

        <div className="flex items-center gap-2 bg-white px-6 py-3 rounded-full shadow-lg">
          <Trophy className="w-6 h-6 text-yellow-500" />
          <span className="text-2xl font-bold text-gray-800">Score: {score}</span>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
          <h1 className="text-4xl font-black text-gray-800 mb-8">
            🔢 Math Magic! 🔢
          </h1>

          {/* Math Problem */}
          <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl p-8 mb-8">
            <div className="text-6xl font-black text-gray-800 mb-4">
              {currentProblem.num1} + {currentProblem.num2} = ?
            </div>

            <input
              type="number"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              className="text-4xl font-bold text-center w-32 h-16 border-4 border-purple-300 rounded-xl focus:border-purple-500 focus:outline-none"
              placeholder="?"
            />
          </div>

          {/* Submit Button */}
          <button
            onClick={checkAnswer}
            disabled={!userAnswer}
            className="bg-gradient-to-r from-green-400 to-blue-400 hover:from-green-500 hover:to-blue-500 text-white font-black text-2xl px-12 py-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Check Answer! ✨
          </button>

          {/* Feedback */}
          {feedback && (
            <div className="mt-8 p-6 bg-yellow-100 rounded-2xl">
              <p className="text-2xl font-bold text-gray-800">{feedback}</p>
            </div>
          )}
        </div>

        {/* Celebration Animation */}
        {showCelebration && (
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
            <div className="text-center">
              <div className="text-8xl animate-bounce">🎉</div>
              <div className="text-4xl font-black text-white drop-shadow-lg animate-pulse">
                FANTASTIC!
              </div>
              {/* Floating hearts and stars */}
              <div className="absolute inset-0">
                {[...Array(10)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute animate-ping"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      animationDelay: `${i * 0.2}s`
                    }}
                  >
                    {i % 2 === 0 ? (
                      <Heart className="w-8 h-8 text-pink-400 fill-current" />
                    ) : (
                      <Star className="w-8 h-8 text-yellow-400 fill-current" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
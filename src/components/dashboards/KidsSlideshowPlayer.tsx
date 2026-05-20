import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Sparkles, RefreshCw, Trophy, Play, Pause, Award } from 'lucide-react';

interface TopicData {
  title: string;
  description: string; // Markdown that contains notes and possibly an image URL
  subject: string;
}

interface KidsSlideshowPlayerProps {
  topic: TopicData;
  onClose: () => void;
}

export default function KidsSlideshowPlayer({ topic, onClose }: KidsSlideshowPlayerProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [quizAnswer, setQuizAnswer] = useState<string | null>(null);
  const [quizStatus, setQuizStatus] = useState<'unanswered' | 'correct' | 'incorrect'>('unanswered');
  const [attempts, setAttempts] = useState(0);

  // 1. Extract Visual Image URL if present in description
  const extractVisualUrl = (text: string) => {
    const match = text.match(/!\[[^\]]*\]\((https?:\/\/[^\)]+)\)/i);
    return match ? match[1] : null;
  };

  const imageUrl = extractVisualUrl(topic.description);

  // 2. Parse Quiz Block from the end of the text
  const parseQuiz = (text: string) => {
    const quizRegex = /\[Quiz\]\s*([\s\S]*?)(?:Correct:\s*([A-C]))/i;
    const match = text.match(quizRegex);
    if (!match) return null;
    const body = match[1];
    const correctAnswer = (match[2] || '').trim().toUpperCase();

    const questionMatch = body.match(/Question:\s*(.*)/i);
    const question = questionMatch ? questionMatch[1].trim() : 'Quiz Time!';

    const aMatch = body.match(/A\)\s*(.*)/i);
    const bMatch = body.match(/B\)\s*(.*)/i);
    const cMatch = body.match(/C\)\s*(.*)/i);

    const options = [
      { key: 'A', text: aMatch ? aMatch[1].trim() : '' },
      { key: 'B', text: bMatch ? bMatch[1].trim() : '' },
      { key: 'C', text: cMatch ? cMatch[1].trim() : '' }
    ].filter(o => o.text !== '');

    return {
      question,
      options,
      correctAnswer
    };
  };

  const quiz = parseQuiz(topic.description);

  // 3. Slice Notes text into child-friendly slides
  const parseSlides = (text: string, title: string, subject: string, imgUrl: string | null) => {
    const slidesList: { title: string; content: string[]; image?: string }[] = [];

    // Title Slide (Slide 1)
    slidesList.push({
      title: title,
      content: [`Welcome to our ${subject} adventure today! Let's explore together.`],
      image: imgUrl || undefined
    });

    // Remove markdown image syntax and quiz syntax to get clean notes
    let cleanText = text
      .replace(/!\[[^\]]*\]\([^\)]+\)/g, '')
      .replace(/\[Quiz\][\s\S]*/gi, '')
      .trim();

    // Check for standard markdown headings (##, ###)
    const sections = cleanText.split(/(?=^##\s+|^###\s+)/m);

    if (sections.length > 1 || (sections.length === 1 && sections[0].startsWith('#'))) {
      sections.forEach(sec => {
        const lines = sec.trim().split('\n');
        let secTitle = '';
        const contentLines: string[] = [];

        lines.forEach(l => {
          const line = l.trim();
          if (line.startsWith('#')) {
            secTitle = line.replace(/^#+\s+/, '');
          } else if (line) {
            // Remove simple list formatting and make content cleaner
            const cleanLine = line.replace(/^-\s+|^[\d\.]+\s+/, '');
            if (cleanLine) contentLines.push(cleanLine);
          }
        });

        if (contentLines.length > 0) {
          slidesList.push({
            title: secTitle || 'Let\'s Explore!',
            content: contentLines
          });
        }
      });
    } else {
      // Split by double newlines if no headings present
      const paragraphs = cleanText.split(/\n\s*\n/);
      paragraphs.forEach((p, idx) => {
        const trimmed = p.trim();
        if (trimmed) {
          // Break paragraph into child-friendly bite-sized sentences
          const sentences = trimmed.split(/(?<=[.!?])\s+/);
          slidesList.push({
            title: `Step ${idx + 1}`,
            content: sentences.filter(s => s.trim().length > 0)
          });
        }
      });
    }

    return slidesList;
  };

  const slides = parseSlides(topic.description, topic.title, topic.subject, imageUrl);
  const totalSlides = slides.length + (quiz ? 1 : 0); // Include quiz slide if it exists

  // 4. Autoplay logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && currentSlide < slides.length - 1) {
      timer = setTimeout(() => {
        setCurrentSlide(prev => prev + 1);
      }, 7000); // 7 seconds per slide
    } else if (isPlaying && currentSlide >= slides.length - 1) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentSlide, slides.length]);

  // 5. Lightweight pure-CSS emoji confetti explosion & custom CSS animation keyframes injection
  useEffect(() => {
    if (!document.getElementById('kids-slideshow-custom-styles')) {
      const style = document.createElement('style');
      style.id = 'kids-slideshow-custom-styles';
      style.innerHTML = `
        @keyframes float-emoji {
          0% {
            transform: translateY(105vh) translateX(0) scale(0.4) rotate(0deg);
            opacity: 1;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateY(-10vh) translateX(var(--drift)) scale(1.6) rotate(var(--spin));
            opacity: 0;
          }
        }
        @keyframes kids-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes kids-slide-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes kids-scale-up {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes kids-shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .animate-fadeIn {
          animation: kids-fade-in 0.3s ease-out forwards;
        }
        .animate-slideUp {
          animation: kids-slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-scaleUp {
          animation: kids-scale-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .animate-shake {
          animation: kids-shake 0.4s ease-in-out;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const triggerEmojiConfetti = () => {
    const emojis = ['🎉', '🌟', '✨', '🎈', '🍭', '🦁', '🧸', '🦄', '🌈', '🍦', '🎨', '🏆', '💎', '🚀'];
    const container = document.createElement('div');
    container.className = 'fixed inset-0 pointer-events-none z-[9999] overflow-hidden';
    document.body.appendChild(container);

    for (let i = 0; i < 45; i++) {
      const el = document.createElement('div');
      el.innerText = emojis[Math.floor(Math.random() * emojis.length)];
      el.style.position = 'absolute';
      el.style.left = `${Math.random() * 100}vw`;
      el.style.bottom = '-40px';
      el.style.fontSize = `${24 + Math.random() * 28}px`;
      el.style.animation = `float-emoji ${2 + Math.random() * 2.5}s ease-out forwards`;

      const drift = -200 + Math.random() * 400;
      const spin = -360 + Math.random() * 720;
      el.style.setProperty('--drift', `${drift}px`);
      el.style.setProperty('--spin', `${spin}deg`);
      el.style.animationDelay = `${Math.random() * 1.2}s`;
      
      container.appendChild(el);
    }

    setTimeout(() => {
      container.remove();
    }, 5000);
  };

  const handleQuizAnswer = (key: string) => {
    if (!quiz) return;
    setQuizAnswer(key);
    if (key.trim().toUpperCase() === quiz.correctAnswer.trim().toUpperCase()) {
      setQuizStatus('correct');
      triggerEmojiConfetti();
    } else {
      setQuizStatus('incorrect');
      setAttempts(prev => prev + 1);
      setTimeout(() => {
        // Clear incorrect state so they can try again smoothly
        setQuizAnswer(null);
        setQuizStatus('unanswered');
      }, 1500);
    }
  };

  const handleNext = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/95 backdrop-blur-md p-4 sm:p-6 md:p-8 animate-fadeIn select-none overflow-hidden">
      {/* Dynamic colorful bubble background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-72 h-72 rounded-full bg-pink-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
      <div className="absolute top-[40%] right-[10%] w-60 h-60 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

      {/* Top Header Row */}
      <div className="relative z-10 flex items-center justify-between bg-white/10 rounded-2xl px-5 py-3 border border-white/10 backdrop-blur-sm mb-4 sm:mb-6">
        <div className="flex items-center gap-3">
          <span className="text-xl sm:text-2xl">🎬</span>
          <div className="text-left">
            <span className="text-[10px] uppercase font-bold text-pink-300 tracking-wider">{topic.subject} Lesson</span>
            <h4 className="font-extrabold text-white text-sm sm:text-base line-clamp-1">{topic.title}</h4>
          </div>
        </div>
        
        {/* Navigation & Autoplay info */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              isPlaying ? 'bg-pink-500 text-white animate-pulse' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
            title={isPlaying ? 'Pause Slideshow' : 'Autoplay Slideshow'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white" />}
            <span className="hidden sm:inline">{isPlaying ? 'Autoplay On' : 'Autoplay'}</span>
          </button>
          
          <button 
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all active:scale-95"
            title="Close Lesson"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Slide Content Frame */}
      <div className="relative z-10 flex-1 flex flex-col md:flex-row items-center justify-center gap-6 max-w-6xl mx-auto w-full overflow-hidden">
        {currentSlide < slides.length ? (
          // Content Slides
          <>
            {/* Visual Aid Cartoon Frame */}
            {(slides[currentSlide].image || imageUrl) && (
              <div className="w-full md:w-1/2 flex items-center justify-center p-2">
                <div className="w-full max-w-md aspect-square md:aspect-video rounded-3xl border-4 border-white/10 bg-white/5 shadow-2xl overflow-hidden flex items-center justify-center group relative transition-transform hover:scale-[1.02]">
                  <img
                    src={slides[currentSlide].image || imageUrl || ''}
                    alt="Lesson Visual Illustration"
                    className="object-cover w-full h-full"
                    loading="eager"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
                </div>
              </div>
            )}

            {/* Informational Text Card */}
            <div className={`w-full ${slides[currentSlide].image || imageUrl ? 'md:w-1/2' : 'max-w-2xl'} flex flex-col justify-center`}>
              <div className="bg-white/95 text-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20 space-y-4 max-h-[60vh] overflow-y-auto transform transition-all duration-500 scale-100 relative">
                
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-sm font-bold text-pink-600">
                    {currentSlide + 1}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-pink-600 to-indigo-600 bg-clip-text text-transparent">
                    {slides[currentSlide].title}
                  </h3>
                </div>

                <div className="space-y-3.5 text-base sm:text-lg leading-relaxed font-semibold text-slate-700">
                  {slides[currentSlide].content.map((paragraph, pIdx) => (
                    <p key={pIdx} className="animate-slideUp flex items-start gap-2.5">
                      <span className="text-pink-500 mt-1.5 shrink-0 text-xs">🌟</span>
                      <span>{paragraph}</span>
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          // Interactive Quiz Slide (Final Slide)
          quiz && (
            <div className="w-full max-w-2xl bg-white/95 text-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20 space-y-6 text-center relative overflow-hidden">
              <div className="absolute top-[-10%] right-[-10%] w-32 h-32 rounded-full bg-yellow-400/20 blur-xl pointer-events-none" />
              
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-yellow-100 rounded-full text-yellow-800 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-yellow-600 animate-spin" /> Let's Practice!
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
                {quiz.question}
              </h3>

              {quizStatus === 'correct' ? (
                // Confetti / Celebration Card
                <div className="py-8 space-y-4 animate-scaleUp">
                  <div className="w-20 h-20 bg-yellow-100 border border-yellow-200 rounded-full flex items-center justify-center mx-auto text-4xl shadow-md">
                    🏆
                  </div>
                  <h4 className="text-2xl font-black text-green-600">Fantastic! 100% Correct!</h4>
                  <p className="text-sm font-bold text-gray-500">You did an amazing job today! Tap below to release more magic!</p>
                  
                  <div className="flex justify-center gap-3 pt-2">
                    <button
                      onClick={triggerEmojiConfetti}
                      className="px-6 py-2.5 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white rounded-xl text-sm font-bold shadow-md transform active:scale-95 transition-all flex items-center gap-2"
                    >
                      ✨ Release Magic Confetti! ✨
                    </button>
                  </div>
                </div>
              ) : (
                // Choice Buttons
                <div className="grid grid-cols-1 gap-3.5 pt-2">
                  {quiz.options.map((opt) => {
                    const isSelected = quizAnswer === opt.key;
                    const isWrong = isSelected && quizStatus === 'incorrect';
                    
                    let btnColor = 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200';
                    if (opt.key === 'A') btnColor = 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200/50 text-slate-800';
                    if (opt.key === 'B') btnColor = 'bg-cyan-50 hover:bg-cyan-100 border-cyan-200/50 text-slate-800';
                    if (opt.key === 'C') btnColor = 'bg-rose-50 hover:bg-rose-100 border-rose-200/50 text-slate-800';
                    
                    if (isWrong) {
                      btnColor = 'bg-red-500 text-white border-red-600 animate-shake';
                    }

                    return (
                      <button
                        key={opt.key}
                        onClick={() => quizStatus !== 'correct' && handleQuizAnswer(opt.key)}
                        disabled={quizStatus === 'correct'}
                        className={`w-full text-left p-4 rounded-2xl border-2 text-sm sm:text-base font-extrabold shadow-sm transition-all transform active:scale-[0.98] flex items-center gap-4 ${btnColor}`}
                      >
                        <span className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center font-black shrink-0 text-slate-700 shadow-sm">
                          {opt.key}
                        </span>
                        <span className="flex-1 leading-snug">{opt.text}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {quizStatus === 'incorrect' && (
                <p className="text-xs font-bold text-red-500 animate-bounce pt-1">
                  Oops! That was close! Let's try again! 🌟
                </p>
              )}
              {quizStatus === 'correct' && attempts > 0 && (
                <p className="text-xs text-slate-400 font-semibold italic">
                  Solved after {attempts + 1} attempt{attempts > 0 ? 's' : ''}! Practice makes perfect!
                </p>
              )}
            </div>
          )
        )}
      </div>

      {/* Bottom Footer Controls Row */}
      <div className="relative z-10 mt-4 sm:mt-6 max-w-4xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/10 rounded-2xl px-5 py-3 border border-white/10 backdrop-blur-sm">
        {/* Navigation Indicator / Progress dots */}
        <div className="flex items-center gap-2 flex-wrap justify-center Order-2 sm:order-1">
          {Array.from({ length: totalSlides }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setIsPlaying(false);
                setCurrentSlide(idx);
              }}
              className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                currentSlide === idx 
                  ? 'bg-gradient-to-r from-pink-500 to-indigo-500 scale-125 shadow-md shadow-pink-500/30' 
                  : 'bg-white/20 hover:bg-white/40'
              }`}
              title={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>

        {/* Previous / Next buttons */}
        <div className="flex items-center gap-3 order-1 sm:order-2">
          <button
            onClick={handlePrev}
            disabled={currentSlide === 0}
            className="flex items-center justify-center w-11 h-11 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 text-white rounded-xl transition-all active:scale-90"
            title="Previous Slide"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <span className="text-xs text-white/70 font-bold min-w-16 text-center">
            Slide {currentSlide + 1} of {totalSlides}
          </span>

          {currentSlide < totalSlides - 1 ? (
            <button
              onClick={handleNext}
              className="flex items-center justify-center w-11 h-11 bg-pink-600 hover:bg-pink-700 text-white rounded-xl transition-all shadow-md shadow-pink-600/20 active:scale-90"
              title="Next Slide"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          ) : (
            <div className="w-11 h-11 bg-green-500 rounded-xl flex items-center justify-center text-white" title="Completed!">
              <Award className="w-6 h-6" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

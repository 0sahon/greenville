import { useState } from 'react';
import { BookOpen, ArrowLeft, Star, Heart } from 'lucide-react';

interface ReadingCornerProps {
  onBack: () => void;
  onStoryCompleted?: (storyId: string) => void;
}

export default function ReadingCorner({ onBack, onStoryCompleted }: ReadingCornerProps) {
  const [currentStory, setCurrentStory] = useState(0);

  const stories = [
    {
      title: "The Friendly Lion 🦁",
      content: [
        "Once upon a time, in a beautiful forest, there lived a very friendly lion named Leo.",
        "Leo was different from other lions because he loved to help other animals instead of scaring them.",
        "One day, a little rabbit got lost in the forest and started crying.",
        "Leo heard the crying and gently asked, 'What's wrong, little friend?'",
        "The rabbit was scared at first, but Leo's kind voice made him feel safe.",
        "'I can't find my way home,' said the rabbit.",
        "Leo smiled and said, 'Don't worry! I know this forest very well. I'll help you!'",
        "Together, they walked through the forest, and Leo showed the rabbit the way home.",
        "From that day on, all the animals knew that Leo was the kindest lion in the forest!",
        "The End! 🌟"
      ],
      moral: "Being kind and helpful makes you a true friend to everyone!"
    },
    {
      title: "The Magic Paintbrush 🎨",
      content: [
        "Maya loved to draw and paint more than anything in the world.",
        "One day, she found a special paintbrush that sparkled like stars.",
        "When Maya painted with the magic brush, amazing things happened!",
        "She painted a butterfly, and it flew right off the paper!",
        "She painted flowers, and they filled the room with sweet smells.",
        "Maya realized she could help others with her magic paintbrush.",
        "She painted food for hungry animals and toys for sad children.",
        "The magic paintbrush worked best when Maya used it to help others.",
        "Maya learned that the real magic was in her kind heart!",
        "The End! ✨"
      ],
      moral: "The greatest magic comes from helping others and being creative!"
    }
  ];

  const [currentPage, setCurrentPage] = useState(0);

  const nextPage = () => {
    const newPage = currentPage + 1;
    if (newPage <= stories[currentStory].content.length - 1) {
      setCurrentPage(newPage);
      if (newPage === stories[currentStory].content.length - 1) {
        onStoryCompleted?.(`story-${currentStory}`);
      }
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const nextStory = () => {
    if (currentStory < stories.length - 1) {
      setCurrentStory(currentStory + 1);
      setCurrentPage(0);
    }
  };

  const prevStory = () => {
    if (currentStory > 0) {
      setCurrentStory(currentStory - 1);
      setCurrentPage(0);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-200 via-blue-200 to-purple-200 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 bg-white hover:bg-gray-50 px-4 py-3 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105"
        >
          <ArrowLeft className="w-6 h-6 text-green-600" />
          <span className="text-green-600 font-bold text-lg">Back</span>
        </button>

        <div className="flex items-center gap-2 bg-white px-6 py-3 rounded-full shadow-lg">
          <BookOpen className="w-6 h-6 text-green-500" />
          <span className="text-xl font-bold text-gray-800">Story {currentStory + 1} of {stories.length}</span>
        </div>
      </div>

      {/* Story Book */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Book Header */}
          <div className="bg-gradient-to-r from-green-400 to-blue-400 p-6 text-center">
            <h1 className="text-4xl font-black text-white mb-2">
              📚 Story Time! 📚
            </h1>
            <h2 className="text-3xl font-bold text-white">
              {stories[currentStory].title}
            </h2>
          </div>

          {/* Story Content */}
          <div className="p-8">
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-8 min-h-[400px] flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-6">
                  {currentPage === 0 ? '🌟' : 
                   currentPage === stories[currentStory].content.length - 1 ? '🎉' : '📖'}
                </div>
                <p className="text-2xl leading-relaxed text-gray-800 font-medium max-w-2xl">
                  {stories[currentStory].content[currentPage]}
                </p>
                
                {currentPage === stories[currentStory].content.length - 1 && (
                  <div className="mt-8 p-6 bg-green-100 rounded-2xl">
                    <div className="text-4xl mb-4">💡</div>
                    <p className="text-xl font-bold text-green-800">
                      {stories[currentStory].moral}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Page Navigation */}
            <div className="flex items-center justify-between mt-8">
              <button
                onClick={prevPage}
                disabled={currentPage === 0}
                className="bg-blue-400 hover:bg-blue-500 disabled:bg-gray-300 text-white font-bold px-6 py-3 rounded-full transition-all duration-200 transform hover:scale-105 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>

              <div className="flex items-center gap-2">
                {stories[currentStory].content.map((_, index) => (
                  <div
                    key={index}
                    className={`w-3 h-3 rounded-full transition-all duration-200 ${
                      index === currentPage ? 'bg-blue-500 scale-125' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={nextPage}
                disabled={currentPage === stories[currentStory].content.length - 1}
                className="bg-blue-400 hover:bg-blue-500 disabled:bg-gray-300 text-white font-bold px-6 py-3 rounded-full transition-all duration-200 transform hover:scale-105 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>

            {/* Story Navigation */}
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={prevStory}
                disabled={currentStory === 0}
                className="bg-green-400 hover:bg-green-500 disabled:bg-gray-300 text-white font-bold px-6 py-3 rounded-full transition-all duration-200 transform hover:scale-105 disabled:cursor-not-allowed"
              >
                ← Previous Story
              </button>

              <button
                onClick={nextStory}
                disabled={currentStory === stories.length - 1}
                className="bg-green-400 hover:bg-green-500 disabled:bg-gray-300 text-white font-bold px-6 py-3 rounded-full transition-all duration-200 transform hover:scale-105 disabled:cursor-not-allowed"
              >
                Next Story →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
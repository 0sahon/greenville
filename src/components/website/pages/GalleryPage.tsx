import React, { useState } from 'react';
import { Camera, X, ChevronLeft, ChevronRight, Filter, Sparkles, Star } from 'lucide-react';
import { SCHOOL_NAME } from '../../../config/schoolBrand';

interface PhotoItem {
  src: string;
  category: 'classroom' | 'campus' | 'pupils';
  title: string;
  description: string;
}

export default function GalleryPage() {
  const [filter, setFilter] = useState<'all' | 'classroom' | 'campus' | 'pupils'>('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const photos: PhotoItem[] = [
    {
      src: '/images/1.jpg',
      category: 'classroom',
      title: 'Tactile Sensory Learning',
      description: 'Pupils exploring Montessori sensorial materials to refine spatial understanding.'
    },
    {
      src: '/images/2.jpg',
      category: 'pupils',
      title: 'Smiling Early Learner',
      description: 'Nurturing confidence, happiness, and a lifelong enthusiasm for exploration.'
    },
    {
      src: '/images/3.jpg',
      category: 'classroom',
      title: 'Practical Life Coordination',
      description: 'Developing fine motor coordination and independence through daily household-style works.'
    },
    {
      src: '/images/4.jpg',
      category: 'classroom',
      title: 'Creative Coloring & Arts',
      description: 'Exploring secondary colors, creative shapes, and fine muscle coordination.'
    },
    {
      src: '/images/8.jpg',
      category: 'classroom',
      title: 'Didactic Montessori Equipment',
      description: 'Prepared mathematical beads and geometric cylinders that make abstract concepts touchable.'
    },
    {
      src: '/images/9.jpg',
      category: 'classroom',
      title: 'Early Phonics Exploration',
      description: 'Assembling words using the Montessori sandpapers and Movable Alphabets.'
    },
    {
      src: '/images/10.jpg',
      category: 'classroom',
      title: 'Concrete Math Operations',
      description: 'Beads and board materials explaining addition, tens, and place values physically.'
    },
    {
      src: '/images/11.jpg',
      category: 'campus',
      title: 'Small Group Collaborations',
      description: 'Learning peer communication and cooperative problem solving on the carpet.'
    },
    {
      src: '/images/12.jpg',
      category: 'campus',
      title: 'Outdoor Recreation & Athletics',
      description: 'Building strong gross motor skills and healthy social bonds under the sunshine.'
    },
    {
      src: '/images/8h.jpg',
      category: 'campus',
      title: 'Student Work Sessions',
      description: 'Attentive research and interactive project compilation in prepared school spaces.'
    },
    {
      src: '/images/9h.jpg',
      category: 'campus',
      title: 'Guides Explaining Montessori Lessons',
      description: 'Passionate and certified educators facilitating self-directed academic cycles.'
    },
    {
      src: '/images/10h.jpg',
      category: 'campus',
      title: 'Collaborative Floor Space Learning',
      description: 'Sharing space and coordinating group activities comfortably.'
    },
    {
      src: '/images/11h.jpg',
      category: 'campus',
      title: 'Sensorial Height & Cylinder Studies',
      description: 'Learning equivalence, dimensions, and weight through sensory manipulation.'
    },
    {
      src: '/images/12h.jpg',
      category: 'pupils',
      title: 'Happy Montessori Work Time',
      description: 'Independent choices building deep child focus and academic confidence.'
    },
    {
      src: '/images/13h.jpg',
      category: 'pupils',
      title: 'Group Learning Presentations',
      description: 'Sharing project findings with classroom friends to build public speaking confidence.'
    },
    {
      src: '/images/14h.jpg',
      category: 'classroom',
      title: 'Practical Bead Mathematics',
      description: 'Acquiring place-value understanding of the decimal system through high-quality bead bars.'
    },
    {
      src: '/images/15h.jpg',
      category: 'pupils',
      title: 'Smiles at the Work Tables',
      description: 'Creating a friendly, supportive environment where students grow together.'
    }
  ];

  const filteredPhotos = filter === 'all' 
    ? photos 
    : photos.filter(p => p.category === filter);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex !== null) {
      setLightboxIndex((prev) => (prev === 0 ? filteredPhotos.length - 1 : prev! - 1));
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lightboxIndex !== null) {
      setLightboxIndex((prev) => (prev === filteredPhotos.length - 1 ? 0 : prev! + 1));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-emerald-50 to-amber-50 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-16 relative">
          <div className="absolute top-0 left-10 opacity-10 animate-pulse">
            <Camera className="w-24 h-24 text-indigo-700" />
          </div>
          <span className="inline-block bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-sm font-black mb-4 border border-indigo-100">
            🌟 GMS Campus Gallery
          </span>
          <h1 className="text-5xl md:text-7xl font-black text-gray-800 mb-6 leading-tight">
            Our Interactive 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-500"> Photo Showcase! 📸</span>
          </h1>
          <p className="text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed font-medium">
            Explore high-resolution, actual photos collected from {SCHOOL_NAME} showcasing our prepared environments, children working with real Montessori materials, and cooperative student life.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap justify-center items-center gap-3 mb-12">
          <span className="text-gray-500 font-bold text-sm mr-2 flex items-center gap-1.5">
            <Filter className="w-4 h-4" /> Filter By:
          </span>
          {[
            { id: 'all', label: 'All Photos', emoji: '✨' },
            { id: 'classroom', label: 'Classroom Activities', emoji: '📚' },
            { id: 'campus', label: 'Campus Activities', emoji: '🏫' },
            { id: 'pupils', label: 'Happy Pupils', emoji: '👦' }
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => { setFilter(btn.id as any); setLightboxIndex(null); }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-extrabold text-sm transition-all duration-300 transform hover:scale-105 ${
                filter === btn.id
                  ? 'bg-indigo-600 text-white shadow-lg border-2 border-indigo-600'
                  : 'bg-white text-indigo-900 border-2 border-indigo-100 hover:bg-indigo-50'
              }`}
            >
              <span>{btn.emoji}</span>
              {btn.label}
            </button>
          ))}
        </div>

        {/* Masonry / Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredPhotos.map((photo, index) => (
            <div
              key={photo.src}
              onClick={() => setLightboxIndex(index)}
              className="group relative rounded-3xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-white border border-indigo-50/50 cursor-pointer aspect-square bg-gray-100"
            >
              <img
                src={photo.src}
                alt={photo.title}
                className="w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-indigo-950/90 via-indigo-950/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5 text-white">
                <span className="text-xs text-indigo-200 font-extrabold uppercase tracking-wide bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full self-start mb-2">
                  {photo.category}
                </span>
                <h3 className="font-black text-lg leading-snug flex items-center gap-1.5 text-white">
                  <Star className="w-4 h-4 text-amber-400 fill-current" />
                  {photo.title}
                </h3>
                <p className="text-xs text-indigo-100 font-semibold line-clamp-2 mt-1 leading-relaxed">
                  {photo.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {filteredPhotos.length === 0 && (
          <div className="text-center bg-white rounded-3xl p-12 border border-indigo-100 shadow-md">
            <p className="text-lg text-gray-500 font-bold">No photos found in this category.</p>
          </div>
        )}
      </div>

      {/* Modern Glassmorphic Lightbox Modal */}
      {lightboxIndex !== null && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col justify-between p-4 sm:p-8 animate-fade-in"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Top Bar */}
          <div className="flex justify-between items-center text-white w-full max-w-7xl mx-auto z-10">
            <div className="leading-tight">
              <span className="text-xs text-indigo-400 font-extrabold uppercase tracking-wider bg-indigo-900/50 backdrop-blur border border-indigo-800 px-3 py-1 rounded-full">
                {filteredPhotos[lightboxIndex].category}
              </span>
              <h4 className="text-lg font-black mt-2 text-white">{filteredPhotos[lightboxIndex].title}</h4>
            </div>
            <button
              onClick={() => setLightboxIndex(null)}
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full transition-colors border border-white/10"
              aria-label="Close Lightbox"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Main Slide Panel */}
          <div className="flex-1 flex justify-center items-center relative w-full max-w-5xl mx-auto my-4">
            {/* Prev Trigger */}
            <button
              onClick={handlePrev}
              className="absolute left-2 sm:left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors border border-white/15 text-white z-20"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Slide Image */}
            <div 
              className="relative max-h-[70vh] max-w-full flex items-center justify-center p-2"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={filteredPhotos[lightboxIndex].src}
                alt={filteredPhotos[lightboxIndex].title}
                className="max-h-[68vh] max-w-full rounded-2xl shadow-2xl border-4 border-white/10 object-contain animate-scale-up"
              />
            </div>

            {/* Next Trigger */}
            <button
              onClick={handleNext}
              className="absolute right-2 sm:right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors border border-white/15 text-white z-20"
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Bottom Bar Info */}
          <div className="w-full max-w-3xl mx-auto text-center text-white pb-4 z-10">
            <p className="text-sm text-gray-300 font-medium leading-relaxed bg-black/40 backdrop-blur rounded-2xl p-4 border border-white/5">
              {filteredPhotos[lightboxIndex].description}
            </p>
            <div className="text-xs text-indigo-400 font-bold mt-3">
              Image {lightboxIndex + 1} of {filteredPhotos.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

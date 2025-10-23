import React, { useState, useMemo, useEffect } from 'react';
import { exercises as allExercises, Exercise } from '../data/exercises';
import { LibraryIcon, CloseIcon } from './shared/icons';

const muscleGroups = Array.from(new Set(allExercises.flatMap(e => e.muscle_groups))).sort();
const difficulties = Array.from(new Set(allExercises.map(e => e.difficulty))).sort();

const getYouTubeEmbedUrl = (url: string | undefined): string | null => {
    if (!url) return null;
    try {
        const urlObj = new URL(url);
        let videoId: string | null = null;
        if (urlObj.hostname === 'youtu.be') {
            videoId = urlObj.pathname.slice(1);
        } else if (urlObj.hostname.includes('youtube.com')) {
            videoId = urlObj.searchParams.get('v');
        }
        if (videoId) {
            return `https://www.youtube.com/embed/${videoId}`;
        }
    } catch (error) {
        console.error("Invalid YouTube URL provided:", url, error);
    }
    return null;
};


const ExerciseModal: React.FC<{ exercise: Exercise; onClose: () => void }> = ({ exercise, onClose }) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const imageUrl = useMemo(() => {
        if (exercise.image_url) {
            return exercise.image_url;
        }
        console.warn(`Warning: Exercise '${exercise.name}' (ID: ${exercise.id}) is missing an image_url. Using placeholder in modal.`);
        return `https://placehold.co/600x400/1e293b/f59e0b?text=${encodeURIComponent(exercise.name)}`;
    }, [exercise]);
    
    const embedUrl = getYouTubeEmbedUrl(exercise.youtube_url);

    return (
        <div 
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex justify-center items-center p-4 fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-slate-800 rounded-lg shadow-xl border border-slate-700 w-full max-w-3xl max-h-[90vh] overflow-y-auto relative"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
            >
                <button 
                    onClick={onClose} 
                    className="absolute top-3 right-3 text-slate-400 hover:text-white transition-colors z-10"
                    aria-label="Close"
                >
                    <CloseIcon className="w-6 h-6" />
                </button>

                {embedUrl ? (
                    <div className="w-full aspect-video rounded-t-lg overflow-hidden bg-black">
                         <iframe
                            src={embedUrl}
                            title={`YouTube video player for ${exercise.name}`}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            className="w-full h-full"
                        ></iframe>
                    </div>
                ) : (
                    <img src={imageUrl} alt={exercise.name} className="w-full h-64 object-cover rounded-t-lg" />
                )}
                
                <div className="p-6">
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-500 mb-4">{exercise.name}</h2>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {exercise.muscle_groups.map(group => (
                            <span key={group} className="px-2.5 py-1 text-xs font-semibold text-amber-200 bg-amber-800/50 rounded-full">{group}</span>
                        ))}
                         <span className="px-2.5 py-1 text-xs font-semibold text-cyan-200 bg-cyan-800/50 rounded-full">{exercise.difficulty}</span>
                         <span className="px-2.5 py-1 text-xs font-semibold text-slate-200 bg-slate-600 rounded-full">{exercise.equipment}</span>
                    </div>
                    <div className="prose prose-invert text-slate-300 max-w-none">
                        <h3>How to Perform</h3>
                        <p>{exercise.description}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};


export const ExerciseLibrary: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMuscle, setSelectedMuscle] = useState('All');
    const [selectedDifficulty, setSelectedDifficulty] = useState('All');
    const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

    const filteredExercises = useMemo(() => {
        return allExercises.filter(exercise => {
            const nameMatch = exercise.name.toLowerCase().includes(searchTerm.toLowerCase());
            const muscleMatch = selectedMuscle === 'All' || exercise.muscle_groups.includes(selectedMuscle);
            const difficultyMatch = selectedDifficulty === 'All' || exercise.difficulty === selectedDifficulty;
            return nameMatch && muscleMatch && difficultyMatch;
        });
    }, [searchTerm, selectedMuscle, selectedDifficulty]);

    return (
        <>
            <section className="bg-slate-800/50 p-6 sm:p-8 rounded-lg shadow-xl border border-slate-700 space-y-8">
                <div className="text-center">
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-500">Exercise Library</h2>
                    <p className="text-sm text-slate-400 mt-1 max-w-xl mx-auto">Browse and search for exercises to learn proper form and technique.</p>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                        type="text"
                        placeholder="Search exercises..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-slate-800 border border-slate-600 text-white text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block w-full p-3 md:col-span-1"
                    />
                    <select
                        value={selectedMuscle}
                        onChange={(e) => setSelectedMuscle(e.target.value)}
                        className="bg-slate-800 border border-slate-600 text-white text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block w-full p-3"
                    >
                        <option value="All">All Muscle Groups</option>
                        {muscleGroups.map(group => <option key={group} value={group}>{group}</option>)}
                    </select>
                    <select
                        value={selectedDifficulty}
                        onChange={(e) => setSelectedDifficulty(e.target.value)}
                        className="bg-slate-800 border border-slate-600 text-white text-sm rounded-lg focus:ring-amber-500 focus:border-amber-500 block w-full p-3"
                    >
                        <option value="All">All Difficulties</option>
                        {difficulties.map(diff => <option key={diff} value={diff}>{diff}</option>)}
                    </select>
                </div>

                {/* Exercise Grid */}
                {filteredExercises.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {filteredExercises.map(exercise => {
                            const imageUrl = exercise.image_url || `https://placehold.co/600x400/1e293b/f59e0b?text=${encodeURIComponent(exercise.name)}`;
                            if (!exercise.image_url) {
                                console.warn(`Warning: Exercise '${exercise.name}' (ID: ${exercise.id}) is missing an image_url. Using placeholder in grid.`);
                            }
                            return (
                                <button
                                    key={exercise.id}
                                    onClick={() => setSelectedExercise(exercise)}
                                    className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700 hover:border-amber-500 transition-all duration-300 group text-left focus:outline-none focus:ring-2 focus:ring-amber-500"
                                >
                                    <img src={imageUrl} alt={exercise.name} className="h-40 w-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                    <div className="p-4">
                                        <h3 className="font-semibold text-slate-100 truncate">{exercise.name}</h3>
                                        <p className="text-xs text-amber-400">{exercise.muscle_groups[0]}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-16">
                         <LibraryIcon className="w-16 h-16 text-slate-600 mx-auto mb-4"/>
                         <h3 className="text-xl font-semibold text-slate-300">No Exercises Found</h3>
                         <p className="text-slate-500 mt-2">Try adjusting your search or filters.</p>
                    </div>
                )}
            </section>
            
            {selectedExercise && <ExerciseModal exercise={selectedExercise} onClose={() => setSelectedExercise(null)} />}
        </>
    );
};
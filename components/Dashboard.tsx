import React, { useState, useCallback, useEffect } from 'react';
// Fix: Use firebase.User type from compat library
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { useToast } from '../hooks/useToast';
import { fileToBase64 } from '../utils/helpers';
import * as geminiService from '../services/geminiService';
import * as firestoreService from '../services/firestoreService';
import { Loader } from './shared/Loader';
import { ErrorMessage } from './shared/ErrorMessage';
import { UploadIcon, GoogleIcon } from './shared/icons';

interface DashboardProps {
    user: firebase.User | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
    const { showToast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [mealLogs, setMealLogs] = useState<firestoreService.MealLog[]>([]);
    const [dailyTotals, setDailyTotals] = useState({ calories: 0, protein: 0, carbohydrates: 0, fat: 0 });

    const fetchMealLogs = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        setLoadingMessage('Loading your dashboard...');
        try {
            const logs = await firestoreService.getTodaysMealLogs(user.uid);
            setMealLogs(logs);
        } catch (e: any) {
            setError('Could not load your meal logs. Please try refreshing.');
            showToast(e.message, 'error');
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    }, [user, showToast]);

    useEffect(() => {
        fetchMealLogs();
    }, [fetchMealLogs]);

    useEffect(() => {
        const totals = mealLogs.reduce((acc, log) => {
            acc.calories += log.nutrition.calories;
            acc.protein += log.nutrition.macronutrients.protein;
            acc.carbohydrates += log.nutrition.macronutrients.carbohydrates;
            acc.fat += log.nutrition.macronutrients.fat;
            return acc;
        }, { calories: 0, protein: 0, carbohydrates: 0, fat: 0 });
        setDailyTotals(totals);
    }, [mealLogs]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;
        if (!file.type.startsWith('image/')) {
            showToast("Please select a valid image file.", "error");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Step 1: Analyze food items from image
            setLoadingMessage('Analyzing your meal...');
            const base64Image = await fileToBase64(file);
            const foodItems = await geminiService.analyzeFoodImage(base64Image, file.type);
            if (foodItems.length === 0) {
                throw new Error("Could not identify any food in the image.");
            }

            // Step 2: Get nutritional analysis
            setLoadingMessage('Calculating nutrition...');
            const nutrition = await geminiService.getNutritionalAnalysis(foodItems);
            
            // Step 3: Upload image to storage
            setLoadingMessage('Saving your log...');
            const imageUrl = await firestoreService.uploadImage(file, user.uid);
            
            // Step 4: Save meal log to firestore
            await firestoreService.saveMealLog(user.uid, { imageUrl, foodItems, nutrition });

            showToast("Meal logged successfully!", "success");
            await fetchMealLogs(); // Refresh the list

        } catch (e: any) {
            const errorMessage = e.message || 'An unknown error occurred while logging your meal.';
            setError(`Failed to log meal: ${errorMessage}`);
            showToast(`Error: ${errorMessage}`, "error");
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
            event.target.value = ''; // Reset file input
        }
    };
    
    const MacroPill: React.FC<{label: string; value: number; unit: string; color: string}> = ({ label, value, unit, color }) => (
        <div className={`text-center p-3 rounded-lg ${color}`}>
            <div className="text-xs opacity-80">{label}</div>
            <div className="text-lg font-bold">{Math.round(value)}{unit}</div>
        </div>
    );

    if (!user) {
        return (
            <div className="text-center bg-slate-800/50 p-8 rounded-lg shadow-xl border border-slate-700">
                <h2 className="text-2xl font-bold text-amber-400 mb-4">Welcome to Your Dashboard!</h2>
                <p className="text-slate-300 mb-6">Please sign in to track your meals, view workout plans, and save your progress.</p>
                {/* Note: The actual sign-in logic is in the App header */}
                 <div className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-700 rounded-md font-semibold shadow-sm text-base">
                    <GoogleIcon className="w-6 h-6" />
                    Sign In to Continue
                </div>
            </div>
        )
    }

    return (
        <section className="space-y-10">
            {/* Meal Uploader */}
            <div className="bg-slate-800/50 p-6 rounded-lg shadow-xl border border-slate-700">
                <h2 className="text-2xl font-bold text-center mb-4 text-amber-400">Log Your Meal</h2>
                <label 
                    htmlFor="meal-upload" 
                    className="flex flex-col items-center justify-center w-full h-48 border-2 border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-800/50 hover:bg-slate-700/50 hover:border-amber-500 transition-all duration-300 group"
                >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                        <UploadIcon />
                        <p className="mb-2 text-base text-slate-300"><span className="font-semibold text-amber-400">Click to upload</span> a photo of your meal</p>
                        <p className="text-xs text-slate-500">The AI will analyze it and log your nutrition!</p>
                    </div>
                    <input id="meal-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={isLoading}/>
                </label>
            </div>

            {error && <ErrorMessage error={error} onRetry={() => setError(null)} />}
            {isLoading && <Loader text={loadingMessage} />}

            {/* Daily Summary */}
            <div className="bg-slate-800/50 p-6 rounded-lg shadow-xl border border-slate-700">
                <h2 className="text-2xl font-bold text-center mb-4 text-amber-400">Today's Summary</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-white">
                    <div className="text-center bg-slate-700 p-4 rounded-lg col-span-2 md:col-span-1">
                        <div className="text-sm opacity-80">Calories</div>
                        <div className="text-4xl font-bold tracking-tighter text-amber-400">{Math.round(dailyTotals.calories)}</div>
                        <div className="text-xs opacity-60">kcal</div>
                    </div>
                    <MacroPill label="Protein" value={dailyTotals.protein} unit="g" color="bg-red-800/50"/>
                    <MacroPill label="Carbs" value={dailyTotals.carbohydrates} unit="g" color="bg-blue-800/50"/>
                    <MacroPill label="Fat" value={dailyTotals.fat} unit="g" color="bg-yellow-800/50"/>
                </div>
            </div>

            {/* Meal Logs */}
            <div className="bg-slate-800/50 p-6 rounded-lg shadow-xl border border-slate-700">
                <h2 className="text-2xl font-bold text-center mb-6 text-amber-400">Today's Meals</h2>
                {mealLogs.length > 0 ? (
                    <div className="space-y-6">
                        {mealLogs.map(log => (
                            <div key={log.id} className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-800 p-4 rounded-lg border border-slate-700">
                                <img src={log.imageUrl} alt="Logged meal" className="w-full h-48 object-cover rounded-md" />
                                <div className="md:col-span-2 space-y-3">
                                    <div>
                                        <h3 className="font-semibold text-slate-300">Identified Foods:</h3>
                                        <p className="text-sm text-slate-400">{log.foodItems.join(', ')}</p>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                        <div className="bg-slate-700 p-2 rounded"><strong>Calories:</strong> {log.nutrition.calories}</div>
                                        <div className="bg-slate-700 p-2 rounded"><strong>Protein:</strong> {log.nutrition.macronutrients.protein}g</div>
                                        <div className="bg-slate-700 p-2 rounded"><strong>Carbs:</strong> {log.nutrition.macronutrients.carbohydrates}g</div>
                                        <div className="bg-slate-700 p-2 rounded"><strong>Fat:</strong> {log.nutrition.macronutrients.fat}g</div>
                                    </div>
                                    <details className="text-xs">
                                        <summary className="cursor-pointer text-slate-400 hover:text-white">Show Vitamins & Minerals</summary>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 mt-2 pl-2 border-l border-slate-600">
                                            {log.nutrition.vitamins.map(v => <p key={v.name}>{v.name}: {v.amount}</p>)}
                                            {log.nutrition.minerals.map(m => <p key={m.name}>{m.name}: {m.amount}</p>)}
                                        </div>
                                    </details>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    !isLoading && <p className="text-center text-slate-400">You haven't logged any meals today. Upload a photo to get started!</p>
                )}
            </div>
        </section>
    );
};
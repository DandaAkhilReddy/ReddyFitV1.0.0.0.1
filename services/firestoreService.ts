import { collection, addDoc, getDocs, query, where, serverTimestamp, orderBy, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { NutritionalInfo, WorkoutPlan } from './geminiService';

export interface MealLog {
    id: string;
    userId: string;
    createdAt: Timestamp;
    imageUrl: string;
    foodItems: string[];
    nutrition: NutritionalInfo;
}

/**
 * Uploads an image file to Firebase Storage.
 * @param file The image file to upload.
 * @param userId The ID of the user uploading the file.
 * @returns A promise that resolves with the public URL of the uploaded image.
 */
export const uploadImage = async (file: File, userId: string): Promise<string> => {
    const filePath = `users/${userId}/meals/${Date.now()}-${file.name}`;
    const storageRef = ref(storage, filePath);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
};

/**
 * Saves a meal log to Firestore for a specific user.
 * @param userId The ID of the user.
 * @param mealData The data for the meal log.
 */
export const saveMealLog = async (
    userId: string,
    mealData: { imageUrl: string; foodItems: string[]; nutrition: NutritionalInfo }
): Promise<void> => {
    const mealLogsCollection = collection(db, 'users', userId, 'mealLogs');
    await addDoc(mealLogsCollection, {
        ...mealData,
        createdAt: serverTimestamp(),
    });
};

/**
 * Fetches today's meal logs for a specific user from Firestore.
 * @param userId The ID of the user.
 * @returns A promise that resolves with an array of today's meal logs.
 */
export const getTodaysMealLogs = async (userId: string): Promise<MealLog[]> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1); // Start of tomorrow

    const mealLogsCollection = collection(db, 'users', userId, 'mealLogs');
    const q = query(
        mealLogsCollection,
        where('createdAt', '>=', Timestamp.fromDate(today)),
        where('createdAt', '<', Timestamp.fromDate(tomorrow)),
        orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, userId, ...doc.data() } as MealLog));
};

/**
 * Saves a generated workout plan to Firestore for a specific user.
 * @param userId The ID of the user.
 * @param plan The workout plan object.
 * @param basedOnEquipment A string listing the equipment the plan is based on.
 */
export const saveWorkoutPlan = async (
    userId: string,
    plan: WorkoutPlan,
    basedOnEquipment: string
): Promise<void> => {
     const workoutPlansCollection = collection(db, 'users', userId, 'workoutPlans');
     await addDoc(workoutPlansCollection, {
        plan,
        basedOnEquipment,
        createdAt: serverTimestamp(),
     });
};
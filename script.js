// ==========================================
// 1. CONFIGURATION & IMPORTS
// ==========================================

// YOUR GEMINI API KEY
const GEMINI_API_KEY="AIzaSyCyK5rgLZPqi71frM36f7hw-08toDpxa1o";

// YOUR FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyD0g4Xc2KoshSSSZoHBQAvTZss4JzuZSQQ",
  authDomain: "dev-hack2026.firebaseapp.com",
  projectId: "dev-hack2026",
  storageBucket: "dev-hack2026.firebasestorage.app",
  messagingSenderId: "980980731433",
  appId: "1:980980731433:web:c8b27bfec7d61bf8d39638"
};

// Import Firebase App, Auth, and Firestore from CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Global variable to track current user
let currentUser = null;

// ==========================================
// 2. UI ELEMENTS & MODAL LOGIC
// ==========================================

// Login Modal Elements
const loginModalBg = document.getElementById('loginModalBg');
const openLoginBtn = document.getElementById('openLoginBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const googleSignInBtn = document.getElementById('googleSignInBtn');
const loginContainer = document.getElementById('loginContainer');

// Result Modal Elements (The New Popup)
const resultModal = document.getElementById('resultModal');
const closeResultBtn = document.getElementById('closeResultBtn');
const closeResultOverlay = document.getElementById('closeResultOverlay');
const aiOutput = document.getElementById('aiOutput');

// Input Elements
const submitBtn = document.getElementById('submitBtn');
const userInput = document.getElementById('userInput');

// --- Functions to Control Modals ---

// Login Modal Controls
const openLoginModal = () => loginModalBg.classList.remove('hidden');
const closeLoginModal = () => loginModalBg.classList.add('hidden');

if (openLoginBtn) openLoginBtn.addEventListener('click', openLoginModal);
if (closeModalBtn) closeModalBtn.addEventListener('click', closeLoginModal);

// Result Modal Controls
const openResults = () => resultModal.classList.remove('hidden');
const closeResults = () => resultModal.classList.add('hidden');

if (closeResultBtn) closeResultBtn.addEventListener('click', closeResults);
if (closeResultOverlay) closeResultOverlay.addEventListener('click', closeResults);

// ==========================================
// 3. AUTHENTICATION LOGIC (Google Login)
// ==========================================

// Handle Google Sign In Click
if (googleSignInBtn) {
    googleSignInBtn.addEventListener('click', async () => {
        try {
            await signInWithPopup(auth, googleProvider);
            closeLoginModal(); 
        } catch (error) {
            console.error("Login failed:", error.message);
            alert("Login failed. Check console for details.");
        }
    });
}

// Listen for Login State Changes
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        
        // UPDATE NAVBAR: Show User Profile
        loginContainer.innerHTML = `
            <div class="flex items-center gap-3">
                <img src="${user.photoURL}" alt="Profile" class="w-8 h-8 rounded-full border-2 border-white shadow-sm">
                <button id="signOutBtn" class="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full transition">Sign Out</button>
            </div>
        `;
        document.getElementById('signOutBtn').addEventListener('click', () => {
            signOut(auth);
            window.location.reload(); // Reload page on sign out
        });

    } else {
        currentUser = null;
        // UPDATE NAVBAR: Show Sign In Button
        loginContainer.innerHTML = `
            <button id="openLoginBtn" class="bg-white text-pro-blue px-5 py-2 rounded-full font-bold hover:bg-gray-100 transition shadow-lg">Sign In</button>
        `;
        document.getElementById('openLoginBtn').addEventListener('click', openLoginModal);
    }
});

// ==========================================
// 4. MAIN APP LOGIC (AI + Database)
// ==========================================

submitBtn.addEventListener('click', async () => {
    const text = userInput.value;
    if (!text) return alert("Please describe your situation first.");

    // Loading State
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = `<div class="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div> Analyzing...`;
    submitBtn.disabled = true;

    try {
        // A. Get AI Response
        const aiResponseText = await callGeminiAI(text);
        
        // B. Put text in Modal and Open it
        aiOutput.innerHTML = aiResponseText;
        openResults(); // Open the popup!

        // C. Save to DB (Only if logged in)
        if (currentUser) {
            await saveToDatabase(text, aiResponseText, currentUser.uid);
        }

    } catch (error) {
        console.error("Error:", error);
        alert("Error: " + error.message);
    } finally {
        // Reset Button
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
});

// ==========================================
// 5. GEMINI AI FUNCTION
// ==========================================
async function callGeminiAI(userPrompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    // Structured Prompt for clean HTML output
    const structuredPrompt = `
    Act as a professional Indian Legal Advisor.
    User Situation: "${userPrompt}"
    
    Provide a response in strict HTML format (do not use markdown blocks, just raw HTML tags like <h3>, <p>, <ul>, <li>).
    Structure:
    1. <h3 class="text-xl font-bold text-pro-blue mb-2">The Core Issue</h3> <p>...</p>
    2. <h3 class="text-xl font-bold text-pro-blue mt-4 mb-2">Relevant Laws</h3> <p>...</p>
    3. <h3 class="text-xl font-bold text-pro-blue mt-4 mb-2">Your Rights</h3> <ul class="list-disc pl-5 space-y-1"><li>...</li></ul>
    4. <h3 class="text-xl font-bold text-pro-blue mt-4 mb-2">Action Plan</h3> <ul class="list-disc pl-5 space-y-1"><li>...</li></ul>
    `;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: structuredPrompt }] }] })
        });

        const data = await response.json();

        // Error Handling
        if (data.error) throw new Error(data.error.message);
        if (!data.candidates || data.candidates.length === 0) throw new Error("AI returned no results.");

        let aiText = data.candidates[0].content.parts[0].text;
        // Cleanup Markdown if present
        aiText = aiText.replace(/```html/g, "").replace(/```/g, "");

        return aiText;

    } catch (error) {
        console.error("AI Call Failed:", error);
        throw error;
    }
}

// ==========================================
// 6. DATABASE SAVE FUNCTION
// ==========================================
async function saveToDatabase(query, response, userId) {
    try {
        await addDoc(collection(db, "users", userId, "history"), {
            user_query: query,
            ai_response: response,
            timestamp: new Date()
        });
        console.log("History saved successfully!");
    } catch (e) {
        console.error("Firebase Save Error:", e);
    }
}
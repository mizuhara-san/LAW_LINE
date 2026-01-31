// 1. IMPORTS
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider, 
    onAuthStateChanged, 
    signOut,
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    RecaptchaVerifier,
    signInWithPhoneNumber 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 2. CONFIG
const GEMINI_API_KEY = "AIzaSyAFbBgJUJY0YhAXhmwY6bTkS83rB7IznRM";
const firebaseConfig = {
    apiKey: "AIzaSyD0g4Xc2KoshSSSZoHBQAvTZss4JzuZSQQ",
    authDomain: "dev-hack2026.firebaseapp.com",
    projectId: "dev-hack2026",
    storageBucket: "dev-hack2026.firebasestorage.app",
    messagingSenderId: "980980731433",
    appId: "1:980980731433:web:c8b27bfec7d61bf8d39638"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

let currentUser = null;

// 3. UI REFERENCES
const loginModalBg = document.getElementById('loginModalBg');
const closeModalBtn = document.getElementById('closeModalBtn');
const loginContainer = document.getElementById('loginContainer'); // IMPORTANT: Wrapper for the button
const googleSignInBtn = document.getElementById('googleSignInBtn');

const resultModal = document.getElementById('resultModal');
const closeResultBtn = document.getElementById('closeResultBtn');
const closeResultOverlay = document.getElementById('closeResultOverlay');
const aiOutput = document.getElementById('aiOutput');

const submitBtn = document.getElementById('submitBtn');
const userInput = document.getElementById('userInput');
const fileInput = document.getElementById('fileInput');
const fileCount = document.getElementById('fileCount');

// Login Tabs & Inputs
const tabEmail = document.getElementById('tabEmail');
const tabPhone = document.getElementById('tabPhone');
const emailSection = document.getElementById('emailSection');
const phoneSection = document.getElementById('phoneSection');
const emailAuthBtn = document.getElementById('emailAuthBtn');
const sendOtpBtn = document.getElementById('sendOtpBtn');
const verifyOtpBtn = document.getElementById('verifyOtpBtn');

let selectedFiles = [];

// 4. CORE FUNCTIONS
const openLoginModal = () => loginModalBg.classList.remove('hidden');
const closeLoginModal = () => loginModalBg.classList.add('hidden');
const openResults = () => resultModal.classList.remove('hidden');
const closeResults = () => resultModal.classList.add('hidden');

// 5. EVENT LISTENERS
// Initial Listener for existing button
document.getElementById('openLoginBtn')?.addEventListener('click', openLoginModal);
if (closeModalBtn) closeModalBtn.addEventListener('click', closeLoginModal);
if (closeResultBtn) closeResultBtn.addEventListener('click', closeResults);
if (closeResultOverlay) closeResultOverlay.addEventListener('click', closeResults);

fileInput.addEventListener('change', () => {
    selectedFiles = Array.from(fileInput.files);
    fileCount.textContent = selectedFiles.length ? `(${selectedFiles.length} attached)` : '';
});

// Tab Switching
tabEmail.addEventListener('click', () => {
    emailSection.classList.remove('hidden');
    phoneSection.classList.add('hidden');
    tabEmail.classList.add('border-primary', 'text-primary');
    tabPhone.classList.remove('border-primary', 'text-primary');
});

tabPhone.addEventListener('click', () => {
    phoneSection.classList.remove('hidden');
    emailSection.classList.add('hidden');
    tabPhone.classList.add('border-primary', 'text-primary');
    tabEmail.classList.remove('border-primary', 'text-primary');
    
    if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { 'size': 'invisible' });
    }
});

// 6. AUTHENTICATION LOGIC
// Google Auth
googleSignInBtn?.addEventListener('click', async () => {
    try {
        await signInWithPopup(auth, googleProvider);
        closeLoginModal();
    } catch (error) {
        console.error("Google Login Failed:", error);
    }
});

// Email Auth
emailAuthBtn?.addEventListener('click', async () => {
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
        closeLoginModal();
    } catch (error) {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            await createUserWithEmailAndPassword(auth, email, password);
            closeLoginModal();
        } else {
            alert(error.message);
        }
    }
});

// Phone Auth
let confirmationResult;
sendOtpBtn?.addEventListener('click', async () => {
    const number = document.getElementById('phoneNumber').value;
    const appVerifier = window.recaptchaVerifier;
    try {
        confirmationResult = await signInWithPhoneNumber(auth, number, appVerifier);
        document.getElementById('otpBox').classList.remove('hidden');
        sendOtpBtn.classList.add('hidden');
        alert("OTP sent!");
    } catch (error) {
        alert("SMS Failed: " + error.message);
    }
});

verifyOtpBtn?.addEventListener('click', async () => {
    const code = document.getElementById('otpCode').value;
    try {
        await confirmationResult.confirm(code);
        closeLoginModal();
    } catch (error) {
        alert("Invalid OTP");
    }
});

// Auth State Listener (THE FIX IS HERE)
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        // Replaces "Sign In" with "Sign Out"
        loginContainer.innerHTML = `
            <div class="flex items-center gap-3">
                 <img src="${user.photoURL || 'https://via.placeholder.com/32'}" alt="User" class="w-8 h-8 rounded-full border-2 border-white shadow-sm">
                <button id="signOutBtn" class="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full transition">Sign Out</button>
            </div>
        `;
        document.getElementById('signOutBtn').addEventListener('click', () => {
            signOut(auth);
            window.location.reload();
        });
    } else {
        currentUser = null;
        // Restores "Sign In" button AND RE-ATTACHES LISTENER
        loginContainer.innerHTML = `<button id="openLoginBtn" class="bg-primary text-white px-5 py-2 rounded-full font-bold hover:bg-accent transition shadow-lg">Sign In</button>`;
        document.getElementById('openLoginBtn').addEventListener('click', openLoginModal);
    }
});

// 7. MAIN AI LOGIC
submitBtn.addEventListener('click', async () => {
    const text = userInput.value.trim();
    if (!text && selectedFiles.length === 0) return alert("Please describe your issue.");

    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = `Analyzing...`;
    submitBtn.disabled = true;

    try {
        const aiResponse = await callGeminiAI(text, selectedFiles);
        aiOutput.innerHTML = aiResponse;
        openResults();
        
        if (currentUser) {
            await saveToDatabase(text, aiResponse, currentUser.uid);
        }
    } catch (error) {
        alert("Error: " + error.message);
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        userInput.value = '';
        fileInput.value = '';
        selectedFiles = [];
        fileCount.textContent = '';
    }
});

async function callGeminiAI(prompt, files) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    let parts = [{ text: `Act as a professional Indian Legal Advisor. HTML format. Issue: ${prompt}` }];

    for (const file of files) {
        if (file.type.startsWith('image/')) {
            const base64 = await new Promise(r => { 
                const reader = new FileReader(); 
                reader.onloadend = () => r(reader.result.split(',')[1]); 
                reader.readAsDataURL(file); 
            });
            parts.push({ inlineData: { data: base64, mimeType: file.type } });
        }
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ contents: [{ parts }] })
    });

    const data = await response.json();
    if (data.candidates && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text.replace(/```html/g, "").replace(/```/g, "").trim();
    } else {
        throw new Error("AI Busy. Try again.");
    }
}

async function saveToDatabase(query, response, userId) {
    try {
        await addDoc(collection(db, "users", userId, "history"), {
            user_query: query,
            ai_response: response,
            timestamp: new Date()
        });
    } catch (e) {
        console.error("Save Error:", e);
    }
}
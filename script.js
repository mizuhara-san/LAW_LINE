// ==========================================
// 1. IMPORTS & CONFIG
// ==========================================
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
import { 
    getFirestore, 
    collection, 
    addDoc, 
    doc, 
    setDoc, 
    getDoc, 
    query, 
    orderBy, 
    getDocs 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const GEMINI_API_KEY = "AIzaSyBTfElNntpBK-9N0y_Y7TrckQTGIpRbp2A";

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

// ==========================================
// 2. MAIN LOGIC (Runs only when HTML is ready)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    console.log("✅ App Started: DOM Fully Loaded");

    // UI ELEMENTS - Login
    const loginModalBg = document.getElementById('loginModalBg');
    const emailAuthBtn = document.getElementById('emailAuthBtn');
    const sendOtpBtn = document.getElementById('sendOtpBtn');
    const verifyOtpBtn = document.getElementById('verifyOtpBtn');
    const googleSignInBtn = document.getElementById('googleSignInBtn');

    // UI ELEMENTS - Analyze Feature (NEW)
    const submitBtn = document.getElementById('submitBtn');
    const userInput = document.getElementById('userInput');
    const fileInput = document.getElementById('fileInput');
    const fileCount = document.getElementById('fileCount');
    const resultModal = document.getElementById('resultModal');
    const aiOutput = document.getElementById('aiOutput');

    // --- FILE INPUT HANDLING (NEW) ---
    if (fileInput) {
        fileInput.addEventListener('change', () => {
            const files = Array.from(fileInput.files);
            if(fileCount) fileCount.textContent = files.length ? `(${files.length} attached)` : '';
        });
    }

    // --- TAB SWITCHING LOGIC ---
    const tabEmail = document.getElementById('tabEmail');
    const tabPhone = document.getElementById('tabPhone');

    if (tabEmail && tabPhone) {
        tabEmail.addEventListener('click', () => {
            document.getElementById('emailSection').classList.remove('hidden');
            document.getElementById('phoneSection').classList.add('hidden');
            tabEmail.classList.add('border-primary', 'text-primary');
            tabPhone.classList.remove('border-primary', 'text-primary');
        });

        tabPhone.addEventListener('click', () => {
            document.getElementById('phoneSection').classList.remove('hidden');
            document.getElementById('emailSection').classList.add('hidden');
            tabPhone.classList.add('border-primary', 'text-primary');
            tabEmail.classList.remove('border-primary', 'text-primary');
            
            // Init Recaptcha only once
            if (!window.recaptchaVerifier) {
                window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { 'size': 'invisible' });
            }
        });
    }

    // --- LOGIN BUTTON LISTENERS ---

    // 1. EMAIL LOGIN / SIGNUP
    if (emailAuthBtn) {
        emailAuthBtn.addEventListener('click', async () => {
            console.log("👉 Email Button Clicked");
            const email = document.getElementById('authEmail').value;
            const password = document.getElementById('authPassword').value;

            if (!email || !password) return alert("Please enter email and password");

            emailAuthBtn.innerText = "Processing...";
            try {
                await signInWithEmailAndPassword(auth, email, password);
                console.log("✅ Logged in existing user");
                loginModalBg.classList.add('hidden');
            } catch (error) {
                if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                    try {
                        await createUserWithEmailAndPassword(auth, email, password);
                        console.log("✅ Created new user");
                        loginModalBg.classList.add('hidden');
                    } catch (createError) {
                        alert("Signup Failed: " + createError.message);
                    }
                } else {
                    alert("Login Failed: " + error.message);
                }
            } finally {
                emailAuthBtn.innerText = "Login / Sign Up";
            }
        });
    }

    // 2. GOOGLE LOGIN
    if (googleSignInBtn) {
        googleSignInBtn.addEventListener('click', async () => {
            try {
                await signInWithPopup(auth, googleProvider);
                loginModalBg.classList.add('hidden');
            } catch (error) {
                console.error(error);
                alert("Google Sign-In Failed");
            }
        });
    }

    // 3. PHONE OTP - SEND
    if (sendOtpBtn) {
        sendOtpBtn.addEventListener('click', async () => {
            let phone = document.getElementById('phoneNumber').value.trim();
            if (!phone) return alert("Enter valid phone number");

            // Auto-format phone for India
            if (!phone.startsWith('+')) {
                phone = "+91" + phone;
            }

            try {
                sendOtpBtn.innerText = "Sending...";
                window.confirmationResult = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
                document.getElementById('otpBox').classList.remove('hidden');
                sendOtpBtn.classList.add('hidden');
                alert(`OTP Sent to ${phone}!`);
            } catch (error) {
                console.error(error);
                alert("SMS Error: " + error.message);
                sendOtpBtn.innerText = "Send OTP";
            }
        });
    }

    // 4. PHONE OTP - VERIFY
    if (verifyOtpBtn) {
        verifyOtpBtn.addEventListener('click', async () => {
            const code = document.getElementById('otpCode').value;
            try {
                await window.confirmationResult.confirm(code);
                loginModalBg.classList.add('hidden');
            } catch (error) {
                alert("Invalid Code");
            }
        });
    }

    // --- ANALYZE BUTTON LOGIC (NEW) ---
    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
            console.log("Analyze Button Clicked");
            const text = userInput.value.trim();
            const files = fileInput && fileInput.files ? Array.from(fileInput.files) : [];

            if (!text && files.length === 0) return alert("Please describe your legal issue.");

            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = `Analyzing...`;
            submitBtn.disabled = true;

            try {
                // Call AI
                const aiResponse = await callGeminiAI(text, files);
                
                // Show Result Modal
                if (aiOutput) aiOutput.innerHTML = aiResponse;
                if (resultModal) resultModal.classList.remove('hidden');

                // Save to DB if logged in
                const user = auth.currentUser;
                if (user) {
                    await saveToDatabase(text, aiResponse, user.uid);
                }

            } catch (error) {
                console.error(error);
                alert("AI Error: " + error.message);
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
                userInput.value = '';
                if(fileInput) fileInput.value = '';
                if(fileCount) fileCount.textContent = '';
            }
        });
    }

    // --- GLOBAL MODAL CLOSERS ---
    document.getElementById('closeModalBtn')?.addEventListener('click', () => {
        loginModalBg.classList.add('hidden');
    });
    
    // Result Modal Closers (NEW)
    document.getElementById('closeResultBtn')?.addEventListener('click', () => resultModal.classList.add('hidden'));
    document.getElementById('closeResultOverlay')?.addEventListener('click', () => resultModal.classList.add('hidden'));

    // --- AUTH STATE MONITOR (UI Updates) ---
    onAuthStateChanged(auth, async (user) => {
        const loginContainer = document.getElementById('loginContainer');
        if (!loginContainer) return;

        if (user) {
            // Save Profile to DB
            await createUserProfile(user);

            // Update Header UI
            loginContainer.innerHTML = `
                <div class="flex items-center gap-3">
                    <a href="dashboard.html" class="text-primary font-bold hover:underline text-sm mr-2 hidden md:block">My Dashboard</a>
                     <img src="${user.photoURL || 'https://ui-avatars.com/api/?name=User'}" class="w-8 h-8 rounded-full border border-gray-200">
                    <button id="signOutBtn" class="bg-red-50 text-red-600 text-xs font-bold px-3 py-1 rounded-full hover:bg-red-100 transition">Sign Out</button>
                </div>
            `;
            document.getElementById('signOutBtn').addEventListener('click', () => {
                signOut(auth);
                window.location.reload();
            });
        } else {
            // Reset Header UI
            loginContainer.innerHTML = `<button id="openLoginBtn" class="bg-primary text-white px-5 py-2 rounded-full font-bold hover:bg-accent transition shadow-lg text-sm">Sign In</button>`;
            document.getElementById('openLoginBtn').addEventListener('click', () => {
                loginModalBg.classList.remove('hidden');
            });
        }
    });
});

// ==========================================
// 3. HELPER FUNCTIONS
// ==========================================

// AI Function (NEW)
async function callGeminiAI(prompt, files) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    // 1. Prepare Data
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

    // 2. Fetch from API
    const response = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ contents: [{ parts }] })
    });

    const data = await response.json();

    // 3. Error Handling
    if (data.error) {
        throw new Error(data.error.message);
    }
    
    if (data.candidates && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text.replace(/```html/g, "").replace(/```/g, "").trim();
    } else {
        throw new Error("No response from AI.");
    }
}

// Create/Update User in DB
async function createUserProfile(user) {
    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
            await setDoc(userRef, {
                name: user.displayName || "User",
                email: user.email || user.phoneNumber,
                joinedAt: new Date()
            });
        }
    } catch(e) {
        console.error("DB Error", e);
    }
}

// Save Search to History (NEW)
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
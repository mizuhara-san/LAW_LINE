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

    // UI ELEMENTS
    const loginModalBg = document.getElementById('loginModalBg');
    const emailAuthBtn = document.getElementById('emailAuthBtn');
    const sendOtpBtn = document.getElementById('sendOtpBtn');
    const verifyOtpBtn = document.getElementById('verifyOtpBtn');
    const googleSignInBtn = document.getElementById('googleSignInBtn');

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

    // --- BUTTON EVENT LISTENERS ---

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
            const phone = document.getElementById('phoneNumber').value;
            if (!phone) return alert("Enter valid phone number (+91...)");

            try {
                sendOtpBtn.innerText = "Sending...";
                window.confirmationResult = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
                document.getElementById('otpBox').classList.remove('hidden');
                sendOtpBtn.classList.add('hidden');
                alert("OTP Sent!");
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

    // --- GLOBAL BUTTONS (Close Modal, etc) ---
    document.getElementById('closeModalBtn')?.addEventListener('click', () => {
        loginModalBg.classList.add('hidden');
    });

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
                     <img src="${user.photoURL || 'https://via.placeholder.com/40'}" class="w-8 h-8 rounded-full border border-gray-200">
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

// --- HELPER: SAVE USER TO DB ---
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
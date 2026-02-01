# ⚖️ Law-Line: AI-Powered Legal Awareness Platform https://lawline-ai.vercel.app/

![Project Banner](https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=2000&auto=format&fit=crop)

> **Clarity over legal confusion.** > *Bridging the gap between the Indian Constitution and the Common Man.*

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Firebase](https://img.shields.io/badge/Firebase-039BE5?style=for-the-badge&logo=Firebase&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=google%20gemini&logoColor=white)

---

## 📖 The Problem
India has one of the lengthiest constitutions in the world, yet legal literacy remains alarmingly low.
* **Complex Jargon:** Legal documents are written in archaic English that is hard to understand.
* **High Cost:** Basic legal advice is often unaffordable for low-income groups.
* **Fear:** Citizens fear approaching police or courts due to a lack of knowledge about their rights.

## 💡 The Solution: Law-Line
**Law-Line** is an AI-driven legal companion that democratizes access to justice. It uses **Google Gemini 1.5 Flash** to translate complex legal queries into simple, actionable advice in plain English (and regional languages in the future).

---

## ✨ Key Features

### 🤖 AI Legal Analysis
* Users can type a query or upload a document (Image/PDF).
* Powered by **Google Gemini API** to analyze legal risks and summarize rights.
* Restricted to **Verified Indian Government Sources** to ensure accuracy.

### 🔐 Robust Authentication
* **Phone Login (OTP):** Secure login via Firebase Phone Auth (supports Indian +91 numbers).
* **Google Sign-In:** One-tap login for ease of use.
* **Email/Password:** Traditional login with auto-account creation.

### 👤 User Dashboard
* **Search History:** All past queries and AI responses are saved to **Firestore**.
* **Profile Management:** View joined date and account details.

### 📄 PDF Export
* Users can download their legal advice as a professionally formatted **PDF** for offline reference.

### 📱 Responsive Design
* Built with **Tailwind CSS**, ensuring a seamless experience on Mobile, Tablet, and Desktop.

---

## 🛠️ Tech Stack

| Component | Technology |
| :--- | :--- |
| **Frontend** | HTML5, Tailwind CSS (CDN) |
| **Logic** | Vanilla JavaScript (ES6+ Modules) |
| **Authentication** | Firebase Auth (Google, Phone, Email) |
| **Database** | Firebase Firestore (NoSQL) |
| **AI Model** | Google Gemini 2.5 Flash |
| **PDF Generation** | html2pdf.js |
| **Hosting** | Vercel / Render |

---

## 🚀 How to Run Locally

Follow these steps to set up the project on your local machine.

### 1. Clone the Repository
```bash
git clone [https://github.com/your-username/law-line.git](https://github.com/your-username/law-line.git)
cd law-line

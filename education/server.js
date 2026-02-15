const express = require('express');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Groq = require("groq-sdk"); // Integrated from second code
const cors = require('cors');

const app = express();

// Enable CORS for all requests
app.use(cors());

// Increase payload size to handle large transcripts/files
app.use(express.json({ limit: '50mb' }));

// --- 1. CONFIGURATION ---
const GEMINI_KEY = ""; 
const GROQ_KEY = ""; 
const TRANSCRIPT_API_KEY = ""; 

const genAI = new GoogleGenerativeAI(GEMINI_KEY);
const groq = new Groq({ apiKey: GROQ_KEY }); // Initialized Groq

// Default Model for Education features (From First Code)
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    systemInstruction: "You are the Glow Scribe. You convert raw technical content into structured, student-friendly B.Tech Roadmaps with emojis and clear headings." 
});

// --- 2. LEGENDS DATABASE (Full list from First Code) ---
const SENIOR_PERSONAS = {
    "sundar": {
        name: "Sundar Pichai",
        role: "CEO, Google",
        context: "You are Sundar Pichai. Speak with humility, diplomacy, and vision. Focus on 'Deep Learning', 'Scale', and 'Solving hard problems'. Be encouraging to the student."
    },
    "elon": {
        name: "Elon Musk",
        role: "Technoking, Tesla",
        context: "You are Elon Musk. Be direct, intense, and use physics metaphors. Talk about 'First Principles' and 'Orders of Magnitude'. If they ask for easy advice, tell them to work harder (100 hours/week)."
    },
    "jobs": {
        name: "Steve Jobs",
        role: "Co-founder, Apple",
        context: "You are Steve Jobs. Be a perfectionist and slightly blunt. Tell them to 'Stay Hungry, Stay Foolish'. Focus heavily on Design, Simplicity, and User Experience. Critique their ideas if they lack soul."
    },
    "ratan": {
        name: "Ratan Tata",
        role: "Chairman Emeritus, Tata",
        context: "You are Ratan Tata. Be extremely humble, ethical, and patriotic. Focus on 'Trust', 'Nation Building', and 'Giving back to society'. Remind them that success without ethics is failure."
    },
    "warren": {
        name: "Warren Buffett",
        role: "CEO, Berkshire Hathaway",
        context: "You are Warren Buffett. Be patient and folksy. Talk about 'Compounding' (both knowledge and money) and long-term thinking. Advise them to invest in themselves."
    },
    "ashneer": {
        name: "Ashneer Grover",
        role: "Ex-Founder, BharatPe",
        context: "You are Ashneer Grover. Be extremely blunt and use Hinglish slang like 'Doglapan' and 'Bhai kya kar raha hai tu?'. Focus on execution, money, and 'Dhanda' (business). If the student's idea is generic, roast them gently."
    },
    "deepinder": {
        name: "Deepinder Goyal",
        role: "CEO, Zomato",
        context: "You are Deepinder Goyal. Focus on 'Grit', 'Hustle', and 'Customer Obsession'. Tell the student that design and user experience are everything. Be motivating but demanding."
    },
    "aryan": {
        name: "Aryan (IIT Delhi)",
        role: "Final Year, CSE @ IIT Delhi",
        context: "You are Aryan, a final year CSE student at IIT Delhi. You are a supportive 'Bhaiya'. You cracked a Google internship. Advise on 'Competitive Coding' (Codeforces/LeetCode), 'Maintaining CGPA', and 'Campus Life'. Use slang like 'facha', 'scene', 'chill', 'proxy'."
    },
    "riya": {
        name: "Riya (IIT Bombay)",
        role: "Placement Coordinator, IIT Bombay",
        context: "You are Riya, a placement coordinator at IIT Bombay. You are smart, organized, and focused on 'Placements' and 'Resume Building'. Advise on 'Interview Prep', 'Soft Skills', and 'Internships'. Be strict about deadlines and formatting."
    },
    "aditi": {
        name: "Dr. Aditi",
        role: "Student Counselor",
        context: "You are Dr. Aditi, a compassionate mental health counselor. Listen to the student's stress, exam anxiety, and burnout. Offer calming advice, breathing techniques, and remind them that grades do not define their worth. Be very gentle."
    }
};

// ==================================================
// ROUTE 0: HEALTH CHECK
// ==================================================
app.get('/', (req, res) => {
    res.send("<h1>🚀 Glow Stack Mega Backend is ONLINE!</h1>");
});

// ==================================================
// ROUTE 1: TUBE SCRIBE (From First Code)
// ==================================================
app.post('/youtube-to-notes', async (req, res) => {
    const { videoUrl } = req.body;
    try {
        console.log(`🔗 [TubeScribe] Processing: ${videoUrl}`);
        const url = `https://transcriptapi.com/api/v2/youtube/transcript?video_url=${encodeURIComponent(videoUrl)}&format=json`;
        const apiRes = await fetch(url, {
            method: 'GET',
            headers: { "Authorization": `Bearer ${TRANSCRIPT_API_KEY}` }
        });
        const data = await apiRes.json();
        if (!apiRes.ok) {
            return res.status(apiRes.status).json({ notes: `### ⚠️ API Error\nReason: ${data.detail || "Restricted."}` });
        }
        let fullText = data.transcript.map(item => item.text).join(' ');
        const prompt = `ROLE: B.Tech Mentor. TASK: Create roadmap from: ${fullText}`;
        const result = await model.generateContent(prompt);
        res.json({ notes: result.response.text() });
    } catch (error) { res.status(500).json({ notes: "Server Error." }); }
});

// ==================================================
// ROUTE 2: SENIOR BRIDGE (From First Code)
// ==================================================
app.post('/api/senior-chat', async (req, res) => {
    const { seniorId, message, history } = req.body;
    const persona = SENIOR_PERSONAS[seniorId];
    if (!persona) return res.status(404).json({ reply: "Mentor not found." });
    try {
        const seniorModel = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            systemInstruction: `IDENTITY: ${persona.context} TONE: Persona-accurate. CONSTRAINTS: Short.`
        });
        const chat = seniorModel.startChat({ history: Array.isArray(history) ? history : [] });
        const result = await chat.sendMessage(message);
        res.json({ reply: result.response.text() });
    } catch (error) { res.status(500).json({ reply: "I lost connection." }); }
});

// ==================================================
// ROUTE 3: LIVE LECTURE (From First Code)
// ==================================================
app.post('/generate-notes', async (req, res) => {
    const { transcript } = req.body;
    if (!transcript) return res.status(400).json({ notes: "No audio detected." });
    try {
        const result = await model.generateContent(`Analyze this live lecture and provide bullet points: ${transcript}`);
        res.json({ notes: result.response.text() });
    } catch (error) { res.status(500).json({ notes: "Processing failed." }); }
});

// ==================================================
// ROUTE 4: DOC SIMPLIFIER (From First Code)
// ==================================================
app.post('/simplify-doc', async (req, res) => {
    const { text, mode } = req.body;
    let instruction = mode === 'eli5' ? "Explain like I'm 10." : "Convert into bullet points.";
    try {
        const result = await model.generateContent(`TASK: ${instruction} TEXT: ${text}`);
        res.json({ reply: result.response.text() });
    } catch (error) { res.status(500).json({ reply: "Could not simplify." }); }
});

// ==================================================
// ROUTE 5: GROQ STYLE ADVICE (From Second Code)
// ==================================================
app.post('/api/style-advice', async (req, res) => {
    const { shape, mode } = req.body; 
    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: "You are a celebrity barber. Give 3 specific hairstyle recommendations for the provided face shape. Use bullet points." },
                { role: "user", content: `My face shape is ${shape}. What are the best hairstyles for me?` }
            ],
            model: "llama-3.3-70b-versatile", 
        });
        res.json({ reply: completion.choices[0]?.message?.content });
    } catch (e) { res.status(500).json({ reply: "Groq is busy!" }); }
});

// ==================================================
// ROUTE 6: VISION ANALYZER (Original Logic)
// ==================================================
app.post('/api/analyze-style', async (req, res) => {
    const { image, mode } = req.body;
    try {
        const visionModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const prompts = {
            hair: "Analyze this face shape. Suggest 3 specific hairstyles that suit this person. Mention why.",
            skin: "Look at this person's skin. Detect any visible acne or dark circles. Suggest 2 cheap home remedies.",
            glasses: "Based on this face shape, suggest the best spectacle frame shapes (e.g., Aviator, Wayfarer, Round)."
        };
        const result = await visionModel.generateContent([
            prompts[mode] || prompts.hair,
            { inlineData: { data: image, mimeType: "image/jpeg" } }
        ]);
        res.json({ reply: result.response.text() });
    } catch (error) {
        res.status(500).json({ reply: "Vision is rate-limited. Try again later!" });
    }
});

// ==================================================
// NEW ROUTE 7: MEGA SCAN (Combined Analysis)
// ==================================================
app.post('/api/mega-style', async (req, res) => {
    const { shape, mode } = req.body; // shape: "Oval", etc.

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { 
                    role: "system", 
                    content: `You are an elite celebrity stylist and grooming expert. 
                    Provide a comprehensive 'Glow Up' report for a student with a ${shape} face shape.` 
                },
                { 
                    role: "user", 
                    content: `Provide advice in 4 sections:
                    1. HAIRSTYLES: 3 specific cuts for a ${shape} face.
                    2. SKINCARE: 2 hostel-friendly tips for glowing skin.
                    3. BEARD/STACHE: Best grooming style for this geometry.
                    4. GLASSES: Best frame shapes (e.g., Aviator, Square).
                    Use emojis and keep it punchy!` 
                }
            ],
            model: "llama-3.3-70b-versatile", 
        });

        res.json({ reply: completion.choices[0]?.message?.content });
    } catch (error) {
        console.error("Groq Mega Error:", error);
        res.status(500).json({ reply: "Groq is currently busy. Try again!" });
    }
});

// ==================================================
// ROUTE: LEGENDARY FITNESS AI (Combined Nutrition & Training)
// ==================================================
app.post('/api/legendary-fitness', async (req, res) => {
    const { messMeal, fitnessGoal } = req.body;

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { 
                    role: "system", 
                    content: "You are the Legendary Fitness AI. You specialize in helping Indian hostel students optimize their health using limited mess food and small dorm spaces." 
                },
                { 
                    role: "user", 
                    content: `I ate ${messMeal} in the mess. My goal is ${fitnessGoal}. 
                    Provide:
                    1. 🥗 THE MESS HACK: How to balance this meal (e.g., add dahi, skip extra rice).
                    2. 🦾 DORM-ROOM WOD: A 15-minute workout for a tiny space (no equipment).
                    3. 📺 VIDEO SEARCH: Provide a specific YouTube search query for this routine.
                    
                    Format: Use clear headings and emojis. Put the video search query on the last line starting with 'QUERY:'`
                }
            ],
            model: "llama-3.3-70b-versatile", 
        });

        res.json({ reply: completion.choices[0]?.message?.content });
    } catch (e) {
        res.status(500).json({ reply: "The Legendary Coach is currently lifting. Try again!" });
    }
});
// ==================================================
// ROUTE: CONFIDENCE BOOSTER (Quotes + Challenges)
// ==================================================
app.post('/api/confidence-boost', async (req, res) => {
    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { 
                    role: "system", 
                    content: "You are the Glow Stack Confidence Coach. You help B.Tech students overcome social anxiety and build alpha-level presence." 
                },
                { 
                    role: "user", 
                    content: `Generate a fresh 'Confidence Protocol' including:
                    1. QUOTE: One hard-hitting motivational quote.
                    2. BODY LANGUAGE: One specific tip (e.g., the 'Power Lean').
                    3. CHALLENGE: One small social task for today (e.g., 'Make eye contact with 3 strangers').
                    
                    Keep it short, aggressive, and motivating. Add emojis.` 
                }
            ],
            model: "llama-3.3-70b-versatile", 
        });

        res.json({ reply: completion.choices[0]?.message?.content });
    } catch (e) {
        res.status(500).json({ reply: "Stay strong. Even the AI needs a break sometimes." });
    }
});

// Start the Server
const PORT = 3000;
app.listen(PORT, () => console.log(`
🚀 GLOW STACK MEGA BACKEND IS RUNNING!
----------------------------------
🔗 URL: http://localhost:${PORT}
✅ All Education Features Active
✅ All Lifestyle Features Active (Including MEGA SCAN)
----------------------------------
`));